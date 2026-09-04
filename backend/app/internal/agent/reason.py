"""
TRUST AI Reasoning Engine Loop
Executes: Observe -> Decide -> Call -> Re-evaluate under a hard cost budget.
"""
import time
from typing import List, Tuple
from app.schemas import (
    TransactionEvent, BusinessBinding, CounterpartyHistory,
    SignalResult, MachineVerdict, MerchantInstruction
)
from app.internal.camara.tools import CamaraClient, TOOL_REGISTRY
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
            num_res = await self.camara.verify_number(msisdn)
            units_spent += 1
            is_pass = num_res.get("verified", False)
            signals_collected.append(SignalResult(
                name="verify_number",
                status="pass" if is_pass else "fail",
                weight=0.40,
                cost_units=1,
                details=num_res
            ))

        # ----------------------------------------------------
        # Step 2: Device Reachability check (1 unit)
        # ----------------------------------------------------
        if units_spent + 1 <= budget:
            dev_res = await self.camara.get_device_status(msisdn)
            units_spent += 1
            is_pass = dev_res.get("reachable", False)
            signals_collected.append(SignalResult(
                name="get_device_status",
                status="pass" if is_pass else "fail",
                weight=0.20,
                cost_units=1,
                details=dev_res
            ))

        # If device is completely dark/unreachable and number fails -> don't waste budget, stop early
        if not signals_collected[0].status == "pass" and not signals_collected[1].status == "pass":
            # Scenario C early decision
            if units_spent + 1 <= budget:
                rec_res = await self.camara.check_number_recycling(msisdn)
                units_spent += 1
                signals_collected.append(SignalResult(
                    name="check_number_recycling",
                    status="fail" if rec_res.get("recycled") else "pass",
                    weight=0.25,
                    cost_units=1,
                    details=rec_res
                ))

        # ----------------------------------------------------
        # Step 3: Adaptive Escalation based on Risk
        # ----------------------------------------------------
        # Check if transaction is elevated/critical or new counterparty
        is_elevated = event.amount.value >= (binding.value_bands.elevated[0] or 15000)
        is_new_counterparty = history.prior_transactions == 0

        # If elevated and suspicious or high value: Buy expensive SIM Swap probe (2 units)
        if (is_elevated or is_new_counterparty) and (units_spent + 2 <= budget):
            sim_res = await self.camara.check_sim_swap(msisdn)
            units_spent += 2
            is_swapped = sim_res.get("swapped", False)
            signals_collected.append(SignalResult(
                name="check_sim_swap",
                status="fail" if is_swapped else "pass",
                weight=0.35,
                cost_units=2,
                details=sim_res
            ))

            # If SIM was recently swapped, buy Location Verification (1 unit)
            if is_swapped and units_spent + 1 <= budget:
                loc_res = await self.camara.verify_location(msisdn, declared_loc)
                units_spent += 1
                is_match = loc_res.get("match", False)
                signals_collected.append(SignalResult(
                    name="verify_location",
                    status="pass" if is_match else "fail",
                    weight=0.30,
                    cost_units=1,
                    details=loc_res
                ))

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
