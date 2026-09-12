"""
LLM-driven TRUST reasoning agent.

Replaces the fixed if/else decision tree with an OpenRouter chat-completions
model that is handed the seven CAMARA tools as OpenAI-style function
definitions and decides, turn by turn, which signal is worth its cost given
the remaining budget — the same Observe -> Decide -> Call -> Re-evaluate
loop, just driven by a model instead of hardcoded branches.

The model NEVER computes the final score or decision: every tool result
still funnels through the same `synthesize_verdict` deterministic floor as
before, so carrier-signal scoring and the safety-rule overrides are
unaffected by anything the LLM says. The LLM only chooses which signals to
buy; it cannot talk its way past a rule like "recent SIM swap on a
high-value transaction caps the score".
"""
import json
import logging
import time
from typing import Awaitable, Callable, Dict, List, Tuple

import httpx

from app.config import settings
from app.schemas import (
    TransactionEvent, BusinessBinding, CounterpartyHistory,
    SignalResult, MachineVerdict, MerchantInstruction
)
from app.internal.camara.tools import CamaraClient, CamaraUnavailableError, TOOL_REGISTRY
from app.internal.verdict.synthesize import synthesize_verdict

logger = logging.getLogger("trust.llm_agent")

# Original heuristic weights, preserved so synthesize_verdict's scoring
# (uncertain-signal penalty is proportional to weight) behaves identically
# regardless of whether the fixed agent or the LLM agent chose the tool.
SIGNAL_WEIGHTS: Dict[str, float] = {
    "verify_number": 0.40,
    "get_device_status": 0.20,
    "check_number_recycling": 0.25,
    "check_sim_swap": 0.35,
    "verify_location": 0.30,
    "retrieve_location": 0.30,
    "kyc_match": 0.25,
}

MAX_TOOL_ITERATIONS = 9


class LLMTrustAgent:
    def __init__(self, camara_client: CamaraClient):
        self.camara = camara_client

    def calculate_budget(self, event: TransactionEvent, binding: BusinessBinding) -> int:
        val = event.amount.value
        critical_floor = binding.value_bands.critical[0] or 60000
        elevated_floor = binding.value_bands.elevated[0] or 15000
        if val >= critical_floor:
            return 8
        elif val >= elevated_floor:
            return 5
        return 3

    # ------------------------------------------------------------------
    # Tool execution (identical contract to the fixed agent's _call_signal)
    # ------------------------------------------------------------------
    async def _call_signal(
        self,
        name: str,
        call: Callable[[], Awaitable[dict]],
        pass_check: Callable[[dict], bool],
        agent_reason: str | None = None,
    ) -> SignalResult:
        weight = SIGNAL_WEIGHTS.get(name, 0.25)
        cost_units = TOOL_REGISTRY[name].cost_weight
        try:
            details = await call()
        except CamaraUnavailableError as exc:
            return SignalResult(
                name=name, status="uncertain", weight=weight, cost_units=cost_units,
                details={"error": exc.reason, "tool": exc.tool_id}, agent_reason=agent_reason,
            )
        return SignalResult(
            name=name,
            status="pass" if pass_check(details) else "fail",
            weight=weight, cost_units=cost_units, details=details, agent_reason=agent_reason,
        )

    def _tool_dispatch(
        self, event: TransactionEvent
    ) -> Dict[str, Tuple[Callable[[], Awaitable[dict]], Callable[[dict], bool]]]:
        msisdn = event.counterparty.msisdn
        declared_loc = event.counterparty.declared_location
        declared_cell = declared_loc.cell if declared_loc else "16-ALG"
        declared_lat = declared_loc.latitude if declared_loc else None
        declared_lon = declared_loc.longitude if declared_loc else None
        declared_name = event.counterparty.declared_name or ""

        dispatch = {
            "verify_number": (
                lambda: self.camara.verify_number(msisdn),
                lambda d: d.get("verified", False),
            ),
            "get_device_status": (
                lambda: self.camara.get_device_status(msisdn),
                lambda d: d.get("reachable", False),
            ),
            "check_number_recycling": (
                lambda: self.camara.check_number_recycling(msisdn),
                lambda d: not d.get("recycled", False),
            ),
            "check_sim_swap": (
                lambda: self.camara.check_sim_swap(msisdn),
                lambda d: not d.get("swapped", False),
            ),
            "verify_location": (
                lambda: self.camara.verify_location(msisdn, declared_cell, declared_lat, declared_lon),
                lambda d: d.get("match", False),
            ),
            "retrieve_location": (
                lambda: self.camara.retrieve_location(msisdn, declared_lat, declared_lon),
                # A stale or missing fix is never a pass, and without a
                # declared coordinate to compare against there is nothing
                # for the position to agree with — so proximity has to be
                # positively established, not assumed.
                lambda d: (not d.get("stale", False)) and d.get("within_declared_area", False),
            ),
            "kyc_match": (
                lambda: self.camara.kyc_match(msisdn, declared_name),
                lambda d: d.get("match_score", 0) >= 0.7,
            ),
        }
        # Without a declared coordinate there is nothing for a retrieved
        # position to agree with, so the signal could only ever come back
        # non-passing. Withhold it from the planner entirely rather than
        # letting the model spend 2 units on an unanswerable question.
        if declared_lat is None or declared_lon is None:
            dispatch.pop("retrieve_location")
        return dispatch

    # ------------------------------------------------------------------
    # OpenRouter function-calling schema
    # ------------------------------------------------------------------
    def _tool_schemas(self, affordable: List[str]) -> List[dict]:
        schemas = []
        for tool_id in affordable:
            meta = TOOL_REGISTRY[tool_id]
            schemas.append({
                "type": "function",
                "function": {
                    "name": tool_id,
                    "description": (
                        f"{meta.description} Costs {meta.cost_weight} unit(s). "
                        f"Proves: {meta.what_it_proves}"
                    ),
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "reason": {
                                "type": "string",
                                "description": "One sentence on why this signal is worth buying right now.",
                            }
                        },
                        "required": [],
                    },
                },
            })
        return schemas

    def _system_prompt(
        self, event: TransactionEvent, binding: BusinessBinding,
        history: CounterpartyHistory, budget: int
    ) -> str:
        return (
            "You are TRUST, a fraud-verification agent for mobile-network-backed "
            "transaction checks. You decide which CAMARA/GSMA Open Gateway signals "
            "are worth pulling for this transaction, under a strict cost budget. "
            "You do NOT compute the final risk score or decision — a deterministic "
            "downstream system does that from whatever signals you buy. Your only "
            "job is to call the highest-value tools for the money, then stop.\n\n"
            f"Cost budget for this transaction: {budget} units total.\n"
            "Call tools one at a time via function calling. After each result, "
            "decide whether another signal is worth its remaining cost, or whether "
            "you have enough evidence and should stop (return a normal text message "
            "with no tool call to stop).\n\n"
            f"Transaction: {json.dumps(event.dict(), default=str)}\n"
            f"Business binding (merchant risk policy): {json.dumps(binding.dict(), default=str)}\n"
            f"Counterparty history: {json.dumps(history.dict(), default=str)}\n\n"
            "Guidance: cheap signals (Number Verification, Device Status, Number "
            "Recycling — 1 unit) are good first probes. If those are inconclusive, "
            "or the counterparty is new / the amount is elevated, a SIM Swap check "
            "(2 units) and Location Verification (1 unit) catch account takeover. "
            "Location Verification only answers yes/no against the coordinate the "
            "customer declared; Location Retrieval (2 units) instead returns where "
            "the handset actually is, with an accuracy radius. Prefer verification "
            "first because it is cheaper — buy retrieval when verification cannot "
            "settle the question: no coordinate was declared, or verification came "
            "back negative or uncertain on an elevated amount and the size of the "
            "discrepancy is what decides the case (a customer one street outside "
            "the delivery radius and a handset in another region fail verification "
            "identically). A retrieved position that is stale or missing is not a "
            "pass. "
            "KYC Match (2 units) is worth its cost mainly for strict-appetite "
            "merchants or when identity misuse is a declared threat. Never spend "
            "more than the remaining budget.\n\n"
            "Important — treat 'uncertain' results as a red flag, not a shrug: "
            "if a tool result comes back uncertain (the carrier could not "
            "answer at all), that is itself consistent with a burner, "
            "blocked, or intentionally unreachable line — do not treat it as "
            "a neutral non-result. When you see an uncertain result, prefer "
            "buying at least one more corroborating signal if the budget "
            "allows, rather than stopping there. Weigh it even more heavily "
            "against the counterparty history above: a brand-new counterparty "
            "(prior_transactions is 0), one already seen across multiple "
            "tenants, or one with a HOLD/REJECT on record, combined with an "
            "uncertain signal, reads as evasion rather than bad luck, and is "
            "worth spending on KYC Match to corroborate identity even for a "
            "merchant that would not otherwise ask for it."
        )

    async def _openrouter_chat(self, messages: List[dict], tools: List[dict]) -> dict:
        headers = {
            "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://trust.mena-ignite.local",
            "X-Title": "TRUST Verification Agent",
        }
        payload = {
            "model": settings.OPENROUTER_MODEL,
            "messages": messages,
            "temperature": 0.1,
        }
        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = "auto"

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{settings.OPENROUTER_BASE_URL}/chat/completions",
                headers=headers, json=payload,
            )
            resp.raise_for_status()
            return resp.json()

    # ------------------------------------------------------------------
    # Main loop
    # ------------------------------------------------------------------
    async def execute_reasoning_loop(
        self, event: TransactionEvent, binding: BusinessBinding, history: CounterpartyHistory
    ) -> Tuple[MachineVerdict, MerchantInstruction]:
        start_time = time.time()
        budget = self.calculate_budget(event, binding)
        units_spent = 0
        signals_collected: List[SignalResult] = []
        called_tools: set = set()
        dispatch = self._tool_dispatch(event)

        messages: List[dict] = [
            {"role": "system", "content": self._system_prompt(event, binding, history, budget)}
        ]

        try:
            for _ in range(MAX_TOOL_ITERATIONS):
                remaining = budget - units_spent
                affordable = [
                    t for t in dispatch
                    if t not in called_tools and TOOL_REGISTRY[t].cost_weight <= remaining
                ]
                if not affordable:
                    break

                response = await self._openrouter_chat(messages, self._tool_schemas(affordable))
                choice = response["choices"][0]
                message = choice["message"]
                tool_calls = message.get("tool_calls") or []

                if not tool_calls:
                    # Model decided it has enough evidence — stop buying signals.
                    break

                messages.append(message)
                for tc in tool_calls:
                    tool_name = tc["function"]["name"]
                    if tool_name not in dispatch or tool_name in called_tools:
                        messages.append({
                            "role": "tool", "tool_call_id": tc["id"],
                            "content": json.dumps({"error": "unknown_or_already_called_tool"}),
                        })
                        continue
                    if TOOL_REGISTRY[tool_name].cost_weight > (budget - units_spent):
                        messages.append({
                            "role": "tool", "tool_call_id": tc["id"],
                            "content": json.dumps({"error": "budget_exhausted"}),
                        })
                        continue

                    try:
                        tool_args = json.loads(tc["function"].get("arguments") or "{}")
                    except (json.JSONDecodeError, TypeError):
                        tool_args = {}
                    agent_reason = tool_args.get("reason")

                    call, pass_check = dispatch[tool_name]
                    sig = await self._call_signal(tool_name, call, pass_check, agent_reason)
                    units_spent += sig.cost_units
                    signals_collected.append(sig)
                    called_tools.add(tool_name)

                    messages.append({
                        "role": "tool", "tool_call_id": tc["id"],
                        "content": json.dumps({"status": sig.status, "details": sig.details}, default=str),
                    })
        except (httpx.HTTPError, KeyError, IndexError) as exc:
            if not signals_collected:
                # The planner failed before buying a single signal (bad/
                # missing API key, no network, malformed response, ...) —
                # synthesizing now would return a nearly-content-free
                # verdict (no evidence, no history-driven escalation, just
                # the base score) while looking like a normal decision.
                # Propagate instead so the caller falls back to the fixed
                # decision tree, which needs no external LLM call and still
                # reasons over the counterparty history correctly.
                logger.warning("LLM agent failed before buying any signal, falling back to fixed agent: %s", exc)
                raise
            # Otherwise the planner had already bought at least one real
            # signal before failing — proceed to synthesis with that partial
            # evidence rather than discarding it.
            logger.warning("LLM agent loop aborted, synthesizing with partial signals: %s", exc)

        elapsed_ms = int((time.time() - start_time) * 1000) + 120

        return synthesize_verdict(
            signals=signals_collected,
            binding=binding,
            amount_value=event.amount.value,
            budget_allocated=budget,
            cost_units_spent=units_spent,
            latency_ms=elapsed_ms,
            cross_tenant_count=history.msisdn_seen_across_tenants,
            history=history,
        )
