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
    ) -> SignalResult:
        """
        Runs one CAMARA tool call and always returns a SignalResult — pass,
        fail, or (if the carrier call errors/times out) uncertain. This is
        the single choke point every one of the six tools goes through, so
        an unavailable signal can never be silently scored as a pass.
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
            )
        return SignalResult(
            name=name,
            status="pass" if pass_check(details) else "fail",
            weight=weight,
            cost_units=cost_units,
            details=details,
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
        declared_loc = event.counterparty.declared_location.cell if event.counterparty.declared_location else "16-ALG"

        # ----------------------------------------------------
        # Step 1: Base cheap check (Number verification - 1 unit)
        # ----------------------------------------------------
        if units_spent + 1 <= budget:
            sig = await self._call_signal(
                "verify_number", 0.40, 1,
                lambda: self.camara.verify_number(msisdn),
                lambda d: d.get("verified", False),
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
                    lambda: self.camara.verify_location(msisdn, declared_loc),
                    lambda d: d.get("match", False),
                )
                units_spent += 1
                signals_collected.append(loc_sig)

        # ----------------------------------------------------
        # Step 4: Identity corroboration for strict-appetite tenants
        # ----------------------------------------------------
        # A business that declared "strict" risk appetite (fintech/banking
        # settlement, typically) is willing to spend the KYC check's 2 units
        # even when the cheaper signals already agree, because identity
        # misuse is the threat it's actually underwriting against.
        wants_kyc = binding.risk_appetite == "strict" or "identity_misuse" in binding.declared_threats
        if wants_kyc and units_spent + 2 <= budget:
            declared_name = event.counterparty.declared_name or ""
            kyc_sig = await self._call_signal(
                "kyc_match", 0.25, 2,
                lambda: self.camara.kyc_match(msisdn, declared_name),
                lambda d: d.get("match_score", 0) >= 0.7,
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
            cross_tenant_count=history.msisdn_seen_across_tenants
        )
