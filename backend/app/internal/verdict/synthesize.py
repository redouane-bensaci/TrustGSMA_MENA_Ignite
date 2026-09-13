"""
Verdict Synthesizer & Deterministic Safety Floor
Calculates composite risk score and applies immutable guardrails overriding the AI model.
"""
from typing import List, Tuple, Optional
from app.schemas import SignalResult, MachineVerdict, MerchantInstruction, BusinessBinding, CounterpartyHistory

# A merchant's declared `risk_appetite` shifts where the same composite
# score lands on the decision band — it never touches the score itself
# (that stays purely evidence-driven), and it never overrides Rules 1-3
# below (those are an immutable floor regardless of policy). A "strict"
# fintech tenant demands a much higher score to auto-approve and drops to
# HOLD much sooner than a lenient one; the reverse identity+amount can
# legitimately clear one tenant and get held at another.
STRICT_THRESHOLDS = {"approve": 90, "review": 82, "hold": 50}
MODERATE_THRESHOLDS = {"approve": 80, "review": 45, "hold": 20}
LENIENT_THRESHOLDS = {"approve": 40, "review": 25, "hold": 10}


# Reserved MSISDN a caller sends when the counterparty has no SIM to test —
# a desktop/web user, or a customer who never provided a mobile number.
# Every CAMARA API keys off a live SIM, so there is no evidence to buy; the
# transaction is held by default instead of scored on nothing.
NO_SIM_MSISDN = "+00000000000"


def is_no_sim_counterparty(msisdn: str) -> bool:
    clean = (msisdn or "").replace(" ", "").replace("-", "")
    return clean in ("", NO_SIM_MSISDN)


def no_sim_hold_verdict(budget_allocated: int = 0) -> Tuple[MachineVerdict, MerchantInstruction]:
    """HOLD verdict for a counterparty with no SIM — no CAMARA units spent."""
    verdict = MachineVerdict(
        decision="HOLD",
        score=0,
        confidence="low",
        signals=[
            SignalResult(
                name="no_sim_counterparty",
                status="not_applicable",
                weight=0.0,
                cost_units=0,
                details={"reason": "No SIM card provided (computer or no-SIM user); network checks cannot run."},
            )
        ],
        cost_units_spent=0,
        budget_allocated=budget_allocated,
        latency_ms=0,
        override_rule_fired="RULE_0: No SIM card to verify - held by default",
    )
    instruction = MerchantInstruction(
        summary="No SIM card was provided, so no mobile network checks could be run on this customer.",
        recommended_action="Hold the transaction and verify the customer through another channel (ID check, call-back, or in-person confirmation).",
        headline_badge="HOLD · NO SIM TO VERIFY",
    )
    return verdict, instruction


def _decision_thresholds(binding: BusinessBinding, amount_value: float) -> dict:
    appetite = binding.risk_appetite
    if appetite == "strict":
        return STRICT_THRESHOLDS
    if appetite == "conservative_above_elevated":
        # Lenient at everyday amounts, but tightens to the strict band once
        # the transaction crosses into this tenant's own elevated exposure.
        elevated_floor = binding.value_bands.elevated[0] or 15000
        return STRICT_THRESHOLDS if amount_value >= elevated_floor else LENIENT_THRESHOLDS
    # "moderate" and any unrecognized appetite fall back to the original,
    # unshifted decision bands.
    return MODERATE_THRESHOLDS


def synthesize_verdict(
    signals: List[SignalResult],
    binding: BusinessBinding,
    amount_value: float,
    budget_allocated: int,
    cost_units_spent: int,
    latency_ms: int,
    cross_tenant_count: int = 1,
    history: Optional[CounterpartyHistory] = None,
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
    uncertain_count = 0

    # A carrier declining to answer at all is not a neutral non-result — an
    # unreachable/unresponsive signal is itself a pattern real fraud tooling
    # produces deliberately (burner lines, blocked numbers, farmed SIMs), so
    # it is weighted as a genuine red flag rather than a minor shrug.
    # 1. Weight accumulation
    for sig in signals:
        if sig.status == "uncertain":
            any_signal_uncertain = True
            uncertain_count += 1
            base_score -= 30.0 * sig.weight
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

        elif sig.name == "retrieve_location":
            if sig.status == "pass":
                base_score += 10.0
            elif sig.status == "fail":
                # Retrieval reports the actual distance, so — unlike the
                # yes/no verification signal — the penalty can be
                # proportionate to how far off the handset really is. A
                # stale or missing fix is scored like a moderate gap: it
                # is not proof of a mismatch, but it is not corroboration
                # either. Anything beyond ~100 km is a different city and
                # is treated as severely as a failed verification.
                if sig.details.get("stale"):
                    base_score -= 20.0
                    location_failed = True
                else:
                    delta_km = sig.details.get("delta_km") or 0
                    base_score -= 35.0 if delta_km >= 100 else 20.0
                    location_failed = True

        elif sig.name == "kyc_match":
            if sig.status == "pass":
                base_score += 15.0
            elif sig.status == "fail":
                base_score -= 30.0

    # Cross tenant penalty
    if cross_tenant_count >= 3:
        base_score -= 35.0

    # A second (or later) uncertain signal is not "more of the same" — it
    # means the carrier could not corroborate the transaction on any front
    # the agent tried, which is a materially stronger red flag than one
    # isolated gap in the evidence.
    if uncertain_count >= 2:
        base_score -= 20.0

    # Uncertainty is far more suspicious layered on a shaky counterparty
    # than on an established, clean one — a brand-new counterparty, one
    # already flagged across tenants, or one with a HOLD/REJECT on record,
    # combined with a signal the carrier wouldn't corroborate, reads as
    # evasion rather than bad luck.
    history_is_suspicious = bool(
        history and (
            history.prior_transactions == 0
            or history.msisdn_seen_across_tenants >= 2
            or any(v in ("HOLD", "REJECT") for v in history.prior_verdicts)
        )
    )
    if any_signal_uncertain and history_is_suspicious:
        base_score -= 20.0

    # 2. Apply Deterministic Floor Overrides
    score = int(max(0, min(100, round(base_score))))

    # Rule 1: Failed number verification caps at 40
    if number_check_failed and score > 40:
        score = 40
        override_fired = "RULE_1: Number verification failure caps score at 40"

    # Rule 2: SIM swap under 24h on elevated/critical caps the score
    # (forces HOLD/REJECT). The cap only ever lowers a score — evidence
    # that already drove it below the cap keeps its lower value — but the
    # rule is still *recorded as fired* whenever its conditions are met.
    # Gating the whole branch on `score > cap` meant the opposite: the
    # rule announced itself on the mildest case (a swap with every other
    # signal clean, capped 75 -> 44) and stayed silent on the severe one
    # (a swap plus a failed location check, already at 25), so the
    # merchant-facing callout was missing from exactly the transactions it
    # exists to flag.
    critical_threshold = binding.value_bands.critical[0] or 60000
    is_high_exposure = amount_value >= critical_threshold
    if recent_sim_swap and is_high_exposure:
        score = min(score, 22 if location_failed else 44)
        override_fired = "RULE_2: Recent SIM swap under 24h on high-exposure event forces HOLD/REJECT"

    # Rule 3: Malicious device farm / dark SIM rejection
    if device_unreachable and cross_tenant_count >= 3:
        score = 6
        override_fired = "RULE_3: Unreachable device with multi-tenant reuse triggers immediate REJECT"

    # 3. Determine decision band — shifted by this merchant's declared risk
    # appetite (see _decision_thresholds). The score computed above is
    # identical regardless of policy; only where it lands on the band moves.
    thresholds = _decision_thresholds(binding, amount_value)
    if score >= thresholds["approve"]:
        decision = "APPROVE"
        confidence = "high"
    elif score >= thresholds["review"]:
        decision = "REVIEW"
        confidence = "medium"
    elif score >= thresholds["hold"]:
        decision = "HOLD"
        confidence = "high"
    else:
        decision = "REJECT"
        confidence = "high"

    # Any unavailable-signal downgrades confidence one notch, regardless of
    # decision band — the verdict may still be right, but it was reached
    # with a gap in the evidence. This is reflected in `confidence` alone;
    # it deliberately does NOT set `override_rule_fired` — that field is
    # reserved for the three immutable safety-floor rules above, which the
    # UI presents as an alarming, singled-out callout. A carrier signal
    # simply being unavailable is routine and not a rule firing, so it must
    # never be presented to a merchant with the same urgency as a REJECT.
    if any_signal_uncertain:
        confidence = "medium" if confidence == "high" else "low"

    # Budget exhaustion likewise downgrades confidence only — the loop
    # stopped because it ran out of units to spend, not because a rule cut
    # it short.
    elif cost_units_spent >= budget_allocated and confidence == "high":
        confidence = "medium"

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
