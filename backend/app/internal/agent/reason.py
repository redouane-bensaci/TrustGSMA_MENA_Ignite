"""
TRUST AI Reasoning Engine Loop
Executes: Observe -> Decide -> Call -> Re-evaluate under a hard cost budget.
"""
import time
from typing import Awaitable, Callable, List, Tuple
from app.schemas import (
    TransactionEvent, BusinessBinding, CounterpartyHistory,
    SignalResult, MachineVerdict, MerchantInstruction
)
from app.internal.camara.tools import CamaraClient, CamaraUnavailableError
from app.internal.verdict.synthesize import synthesize_verdict

class TrustAgent:
    def __init__(self, camara_client: CamaraClient):
        self.camara = camara_client

    def calculate_budget(self, event: TransactionEvent, binding: BusinessBinding) -> int:
        """Determines cost budget based on exposure and value bands."""
        val = event.amount.value
        critical_floor = binding.value_bands.critical[0] or 60000
        elevated_floor = binding.value_bands.elevated[0] or 15000

        if val >= critical_floor:
            return 8
        elif val >= elevated_floor:
            return 5
        return 3

    async def _call_signal(
        self,
        name: str,
        weight: float,
        cost_units: int,
        call: Callable[[], Awaitable[dict]],
        pass_check: Callable[[dict], bool],
        agent_reason: str | None = None,
    ) -> SignalResult:
        """
        Runs one CAMARA tool call and always returns a SignalResult — pass,
        fail, or (if the carrier call errors/times out) uncertain. This is
        the single choke point every one of the seven tools goes through, so
        an unavailable signal can never be silently scored as a pass.

        `agent_reason` is a short, fixed note on *why the fixed decision
        tree chose to spend the budget on this signal* — the non-LLM
        equivalent of the reasoning the LLM agent narrates for itself, kept
        separate from the final verdict and from the plain-language
        merchant explanation.
        """
        try:
            details = await call()
        except CamaraUnavailableError as exc:
            return SignalResult(
                name=name,
                status="uncertain",
                weight=weight,
                cost_units=cost_units,
                details={"error": exc.reason, "tool": exc.tool_id},
                agent_reason=agent_reason,
            )
        return SignalResult(
            name=name,
            status="pass" if pass_check(details) else "fail",
            weight=weight,
            cost_units=cost_units,
            details=details,
            agent_reason=agent_reason,
        )

    async def execute_reasoning_loop(
        self,
        event: TransactionEvent,
        binding: BusinessBinding,
        history: CounterpartyHistory
    ) -> Tuple[MachineVerdict, MerchantInstruction]:
        start_time = time.time()
        budget = self.calculate_budget(event, binding)
        units_spent = 0
        signals_collected: List[SignalResult] = []

        msisdn = event.counterparty.msisdn
        declared = event.counterparty.declared_location
        declared_loc = declared.cell if declared else "16-ALG"
        declared_lat = declared.latitude if declared else None
        declared_lon = declared.longitude if declared else None

        # ----------------------------------------------------
        # Step 1: Base cheap check (Number verification - 1 unit)
        # ----------------------------------------------------
        if units_spent + 1 <= budget:
            sig = await self._call_signal(
                "verify_number", 0.40, 1,
                lambda: self.camara.verify_number(msisdn),
                lambda d: d.get("verified", False),
                agent_reason="Cheapest, highest-signal probe — always worth buying first.",
            )
            units_spent += 1
            signals_collected.append(sig)

        # ----------------------------------------------------
        # Step 2: Device Reachability check (1 unit)
        # ----------------------------------------------------
        if units_spent + 1 <= budget:
            sig = await self._call_signal(
                "get_device_status", 0.20, 1,
                lambda: self.camara.get_device_status(msisdn),
                lambda d: d.get("reachable", False),
                agent_reason="Second cheap probe — catches a dead/emulated handset early.",
            )
            units_spent += 1
            signals_collected.append(sig)

        # If both cheap checks came back non-passing (fail OR uncertain),
        # don't waste budget guessing further — buy the recycling check.
        first_two_clear = any(s.status == "pass" for s in signals_collected[:2])
        if not first_two_clear:
            if units_spent + 1 <= budget:
                sig = await self._call_signal(
                    "check_number_recycling", 0.25, 1,
                    lambda: self.camara.check_number_recycling(msisdn),
                    lambda d: not d.get("recycled", False),
                    agent_reason="Both cheap probes came back non-passing — checking whether this is simply a reassigned number.",
                )
                units_spent += 1
                signals_collected.append(sig)

        # ----------------------------------------------------
        # Step 3: Adaptive Escalation based on Risk
        # ----------------------------------------------------
        is_elevated = event.amount.value >= (binding.value_bands.elevated[0] or 15000)
        is_new_counterparty = history.prior_transactions == 0

        if (is_elevated or is_new_counterparty) and (units_spent + 2 <= budget):
            sim_sig = await self._call_signal(
                "check_sim_swap", 0.35, 2,
                lambda: self.camara.check_sim_swap(msisdn),
                lambda d: not d.get("swapped", False),
                agent_reason=(
                    "Elevated amount and/or a first-time counterparty — worth the 2 units to rule out account takeover."
                    if is_elevated else
                    "First-time counterparty — worth the 2 units to rule out account takeover."
                ),
            )
            units_spent += 2
            signals_collected.append(sim_sig)

            # Buy Location Verification if the SIM swap signal fired OR
            # came back uncertain — an unreadable swap signal on an
            # elevated transaction is exactly when the next-cheapest
            # corroborating check is worth its cost.
            needs_location = sim_sig.status in ("fail", "uncertain")
            if needs_location and units_spent + 1 <= budget:
                loc_sig = await self._call_signal(
                    "verify_location", 0.30, 1,
                    lambda: self.camara.verify_location(msisdn, declared_loc, declared_lat, declared_lon),
                    lambda d: d.get("match", False),
                    agent_reason="SIM swap signal was not a clean pass — corroborating with device location before deciding.",
                )
                units_spent += 1
                signals_collected.append(loc_sig)

                # Verification only answers yes/no against the declared
                # area. When it says "no" — or couldn't answer at all —
                # the remaining question is *how far off* the handset
                # actually is, which is what retrieval answers: a customer
                # one street outside the delivery radius and a handset in
                # another wilaya both fail verification identically.
                # Worth the extra 2 units only on an elevated exposure,
                # where that distinction changes the decision.
                # Only worth buying when a declared coordinate exists to
                # measure against — without one, retrieval returns a
                # position with nothing to compare it to, which can never
                # corroborate the transaction and would just burn 2 units
                # on a guaranteed non-pass.
                can_measure = declared_lat is not None and declared_lon is not None
                if (
                    can_measure
                    and loc_sig.status in ("fail", "uncertain")
                    and is_elevated
                    and units_spent + 2 <= budget
                ):
                    retrieval_sig = await self._call_signal(
                        "retrieve_location", 0.30, 2,
                        lambda: self.camara.retrieve_location(msisdn, declared_lat, declared_lon),
                        lambda d: (not d.get("stale", False)) and d.get("within_declared_area", False),
                        agent_reason=(
                            "Location verification did not clear — pulling the device's actual position so the "
                            "size of the discrepancy, not just its existence, drives the decision."
                        ),
                    )
                    units_spent += 2
                    signals_collected.append(retrieval_sig)

        # ----------------------------------------------------
        # Step 4: Identity corroboration — strict-appetite tenants, or an
        # unreachable/uncertain signal on a counterparty whose history
        # already looks shaky
        # ----------------------------------------------------
        # A business that declared "strict" risk appetite (fintech/banking
        # settlement, typically) is willing to spend the KYC check's 2 units
        # even when the cheaper signals already agree, because identity
        # misuse is the threat it's actually underwriting against.
        #
        # Separately: a carrier that couldn't answer at all (uncertain) is
        # itself a red flag, not a neutral non-result — and that flag is far
        # more serious layered on a counterparty who is brand new, already
        # flagged across other tenants, or has a HOLD/REJECT on record. Any
        # agent, regardless of the merchant's declared appetite, escalates
        # to the identity check in that combination rather than letting an
        # unreadable signal and a shaky history quietly cancel each other out.
        any_uncertain_so_far = any(s.status == "uncertain" for s in signals_collected)
        history_is_suspicious = (
            history.prior_transactions == 0
            or history.msisdn_seen_across_tenants >= 2
            or any(v in ("HOLD", "REJECT") for v in history.prior_verdicts)
        )
        wants_kyc = (
            binding.risk_appetite == "strict"
            or "identity_misuse" in binding.declared_threats
            or (any_uncertain_so_far and history_is_suspicious)
        )
        if wants_kyc and units_spent + 2 <= budget:
            declared_name = event.counterparty.declared_name or ""
            if any_uncertain_so_far and history_is_suspicious:
                kyc_reason = (
                    "A signal came back uncertain and this counterparty's own history already looks shaky — "
                    "escalating to identity corroboration rather than letting the two gaps cancel out."
                )
            else:
                kyc_reason = (
                    "This merchant's risk policy treats identity misuse as a declared threat — worth confirming "
                    "the declared name against the carrier record."
                )
            kyc_sig = await self._call_signal(
                "kyc_match", 0.25, 2,
                lambda: self.camara.kyc_match(msisdn, declared_name),
                lambda d: d.get("match_score", 0) >= 0.7,
                agent_reason=kyc_reason,
            )
            units_spent += 2
            signals_collected.append(kyc_sig)

        elapsed_ms = int((time.time() - start_time) * 1000) + 120  # simulate network roundtrip

        # ----------------------------------------------------
        # Step 4: Synthesize verdict via Deterministic Floor
        # ----------------------------------------------------
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
