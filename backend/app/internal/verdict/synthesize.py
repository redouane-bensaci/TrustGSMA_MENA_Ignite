"""
Verdict Synthesizer & Deterministic Safety Floor
Calculates composite risk score and applies immutable guardrails overriding the AI model.
"""
from typing import List, Tuple, Optional
from app.schemas import SignalResult, MachineVerdict, MerchantInstruction, BusinessBinding

def synthesize_verdict(
    signals: List[SignalResult],
    binding: BusinessBinding,
    amount_value: float,
    budget_allocated: int,
    cost_units_spent: int,
    latency_ms: int,
    cross_tenant_count: int = 1
) -> Tuple[MachineVerdict, MerchantInstruction]:
    """
    Computes final verdict from collected network signals with deterministic overrides.
    """
    base_score = 75.0
    override_fired: Optional[str] = None
    number_check_failed = False
    recent_sim_swap = False
    device_unreachable = False
    location_failed = False
    any_signal_uncertain = False

    # 1. Weight accumulation
    # An "uncertain" signal (the carrier call errored or timed out) is never
    # treated as a pass — it costs a smaller, fixed penalty proportional to
    # the signal's weight, and always drags final confidence down a notch.
    # See app.internal.camara.tools.CamaraUnavailableError for the source.
    for sig in signals:
        if sig.status == "uncertain":
            any_signal_uncertain = True
            base_score -= 15.0 * sig.weight
            continue

        if sig.name == "verify_number":
            if sig.status == "pass":
                base_score += 15.0
            elif sig.status == "fail":
                base_score -= 40.0
                number_check_failed = True

        elif sig.name == "get_device_status":
            if sig.status == "pass":
                base_score += 10.0
            elif sig.status == "fail":
                base_score -= 35.0
                device_unreachable = True

        elif sig.name == "check_sim_swap":
            if sig.status == "pass":
                base_score += 10.0
            elif sig.status == "fail":
                swap_hours = sig.details.get("swap_hours", 24)
                if swap_hours and swap_hours <= 24:
                    base_score -= 45.0
                    recent_sim_swap = True
                else:
                    base_score -= 20.0

        elif sig.name == "verify_location":
            if sig.status == "pass":
                base_score += 10.0
            elif sig.status == "fail":
                base_score -= 30.0
                location_failed = True

        elif sig.name == "kyc_match":
            if sig.status == "pass":
                base_score += 15.0
            elif sig.status == "fail":
                base_score -= 30.0

    # Cross tenant penalty
    if cross_tenant_count >= 3:
        base_score -= 35.0

    # 2. Apply Deterministic Floor Overrides
    score = int(max(0, min(100, round(base_score))))

    # Rule 1: Failed number verification caps at 40
    if number_check_failed and score > 40:
        score = 40
        override_fired = "RULE_1: Number verification failure caps score at 40"

    # Rule 2: SIM swap under 24h on elevated/critical caps at 45 (forces HOLD/REVIEW)
    critical_threshold = binding.value_bands.critical[0] or 60000
    is_high_exposure = amount_value >= critical_threshold
    if recent_sim_swap and is_high_exposure and score > 44:
        score = 22 if location_failed else 44
        override_fired = "RULE_2: Recent SIM swap under 24h on high-exposure event forces HOLD/REJECT"

    # Rule 3: Malicious device farm / dark SIM rejection
    if device_unreachable and cross_tenant_count >= 3:
        score = 6
        override_fired = "RULE_3: Unreachable device with multi-tenant reuse triggers immediate REJECT"

    # 3. Determine decision band
    if score >= 80:
        decision = "APPROVE"
        confidence = "high"
    elif score >= 45:
        decision = "REVIEW"
        confidence = "medium"
    elif score >= 20:
        decision = "HOLD"
        confidence = "high"
    else:
        decision = "REJECT"
        confidence = "high"

    # Any unavailable-signal downgrades confidence one notch, regardless of
    # decision band — the verdict may still be right, but it was reached
    # with a gap in the evidence, and that must be visible to the caller.
    if any_signal_uncertain:
        confidence = "medium" if confidence == "high" else "low"
        if not override_fired:
            override_fired = "NOTE: One or more network signals were unavailable and scored as uncertainty, not as a pass"

    # Budget exhaustion likewise downgrades confidence — the loop stopped
    # because it ran out of units to spend, not because it was satisfied.
    elif cost_units_spent >= budget_allocated and confidence == "high":
        confidence = "medium"
        if not override_fired:
            override_fired = "NOTE: Cost budget exhausted before every available signal could be bought"

    # 4. Generate Machine Verdict
    machine_verdict = MachineVerdict(
        decision=decision,
        score=score,
        confidence=confidence,
        signals=signals,
        cost_units_spent=cost_units_spent,
        budget_allocated=budget_allocated,
        latency_ms=latency_ms,
        override_rule_fired=override_fired
    )

    # 5. Generate Merchant Instruction (Tier 1 & UI friendly)
    if decision == "APPROVE":
        summary = f"Transaction cleared automatically. {len(signals)} network signals verified without anomalies."
        action = "Proceed with fulfillment / disbursement."
        badge = "APPROVE · CLEAR"
    elif decision == "REVIEW":
        summary = "Minor signal discrepancy detected. Customer binding holds, but verification confidence is moderate."
        action = "Route to manual review queue or trigger step-up in-app authentication."
        badge = "REVIEW · STEP-UP REQUIRED"
    elif decision == "HOLD":
        summary = "High risk detected: recent SIM swap combined with location or transaction anomaly."
        action = "Do not dispatch goods or release funds. Contact the verified customer via a secondary confirmed channel."
        badge = "HOLD · DO NOT DISPATCH"
    else:
        summary = "Severe contradiction: device unreachable, SIM inactive, or suspicious cross-tenant reuse."
        action = "Immediate rejection. Fraud pattern confirmed by mobile carrier network."
        badge = "REJECT · BLOCKED"

    merchant_instruction = MerchantInstruction(
        summary=summary,
        recommended_action=action,
        headline_badge=badge
    )

    return machine_verdict, merchant_instruction
