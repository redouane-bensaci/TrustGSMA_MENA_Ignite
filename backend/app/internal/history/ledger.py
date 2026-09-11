"""
TRUST Internal Ledger & Counterparty History Service
Retrieved independently by the TRUST platform to prevent caller tampering.
"""
from typing import Dict
from app.schemas import CounterpartyHistory

# In-memory mock ledger for hackathon demonstration
MOCK_LEDGER: Dict[str, CounterpartyHistory] = {
    # Scenario A: Known routine counterparty
    "+213550112233": CounterpartyHistory(
        msisdn="+213550112233",
        first_seen="2024-03-11",
        prior_transactions=29,
        prior_verdicts=["APPROVE", "APPROVE", "APPROVE"],
        msisdn_seen_across_tenants=1,
        portable_trust_score=0.97
    ),
    # Scenario B: Stranger counterparty in escalated order
    "+213661448899": CounterpartyHistory(
        msisdn="+213661448899",
        first_seen="6 hours ago",
        prior_transactions=0,
        prior_verdicts=[],
        msisdn_seen_across_tenants=1,
        portable_trust_score=0.11
    ),
    # Nokia NaC sandbox device: +99999991000 ("anomaly present" simulator
    # number) — mirrors Scenario B so live CAMARA calls (sim_swap,
    # kyc_match) against Nokia's real sandbox resolve instead of 404ing.
    "+99999991000": CounterpartyHistory(
        msisdn="+99999991000",
        first_seen="6 hours ago",
        prior_transactions=0,
        prior_verdicts=[],
        msisdn_seen_across_tenants=1,
        portable_trust_score=0.11
    ),
    # Nokia NaC sandbox device: +99999991001 ("clean" simulator number) —
    # mirrors Scenario A so it reads as a routine, trusted counterparty.
    "+99999991001": CounterpartyHistory(
        msisdn="+99999991001",
        first_seen="2024-03-11",
        prior_transactions=29,
        prior_verdicts=["APPROVE", "APPROVE", "APPROVE"],
        msisdn_seen_across_tenants=1,
        portable_trust_score=0.97
    ),
    # Scenario C: Suspicious number used across multiple tenants
    "+213770990011": CounterpartyHistory(
        msisdn="+213770990011",
        first_seen="today",
        prior_transactions=4,
        prior_verdicts=["HOLD", "REJECT"],
        msisdn_seen_across_tenants=4,  # Flag: same number, 4 identities in 24h
        portable_trust_score=0.04
    ),
    # Scenarios E/F: a long-standing, otherwise-clean counterparty whose
    # only anomaly is a declared-name mismatch against the carrier's KYC
    # record. Every other signal (device, SIM recency, location, recycling)
    # comes back clean — used to isolate how a merchant's own declared
    # risk_appetite (strict vs. lenient), not the evidence, decides whether
    # this same transaction gets held or cleared.
    "+213555221100": CounterpartyHistory(
        msisdn="+213555221100",
        first_seen="2023-11-02",
        prior_transactions=12,
        prior_verdicts=["APPROVE", "APPROVE"],
        msisdn_seen_across_tenants=1,
        portable_trust_score=0.71
    )
}

def lookup_counterparty(msisdn: str) -> CounterpartyHistory:
    """Retrieve verified history from TRUST internal ledger."""
    clean_msisdn = msisdn.replace(" ", "").replace("-", "")
    if clean_msisdn in MOCK_LEDGER:
        return MOCK_LEDGER[clean_msisdn]
    
    # Default for completely new MSISDN
    return CounterpartyHistory(
        msisdn=msisdn,
        first_seen="just now",
        prior_transactions=0,
        prior_verdicts=[],
        msisdn_seen_across_tenants=1,
        portable_trust_score=None
    )
