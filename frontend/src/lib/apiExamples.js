export const VERIFY_CURL = `curl -X POST http://localhost:8000/v1/verify \\
  -H "Content-Type: application/json" \\
  -d '{
    "event_type": "transfer",
    "amount": { "value": 184000, "currency": "DZD" },
    "counterparty": {
      "msisdn": "+99999991000",
      "declared_name": "Yacine Mansouri",
      "declared_location": { "cell": "31-ORN", "latitude": 35.6971, "longitude": -0.6308 }
    },
    "channel": "api",
    "idempotency_key": "idem_9f21a4",
    "business_binding_id": "bb_ecommerce_store_02"
  }'`

export const VERIFY_RESPONSE = `{
  "transaction_id": "tx_7e2a9c1b04d1",
  "idempotency_key": "idem_9f21a4",
  "verdict": {
    "decision": "REJECT",
    "score": 0,
    "confidence": "high",
    "signals": [
      { "name": "verify_number", "status": "pass", "weight": 0.40, "cost_units": 1 },
      { "name": "get_device_status", "status": "pass", "weight": 0.20, "cost_units": 1 },
      { "name": "check_sim_swap", "status": "fail", "weight": 0.35, "cost_units": 2, "details": { "swap_hours": 14 } },
      { "name": "verify_location", "status": "fail", "weight": 0.30, "cost_units": 1, "details": { "delta_km": 412 } },
      { "name": "retrieve_location", "status": "fail", "weight": 0.30, "cost_units": 2, "details": { "delta_km": 351.17, "accuracy_m": 2000, "within_declared_area": false, "stale": false } }
    ],
    "cost_units_spent": 7,
    "budget_allocated": 8,
    "latency_ms": 120,
    "override_rule_fired": "RULE_2: Recent SIM swap under 24h on high-exposure event forces HOLD/REJECT"
  },
  "merchant_instruction": {
    "summary": "Severe contradiction: device unreachable, SIM inactive, or suspicious cross-tenant reuse.",
    "recommended_action": "Immediate rejection. Fraud pattern confirmed by mobile carrier network.",
    "headline_badge": "REJECT · BLOCKED"
  },
  "timestamp": "2026-09-11T16:22:57.008Z",
  "counterparty_history": {
    "msisdn": "+99999991000",
    "first_seen": "6 hours ago",
    "prior_transactions": 0,
    "prior_verdicts": [],
    "msisdn_seen_across_tenants": 1,
    "portable_trust_score": 0.11
  }
}`

export const BUSINESS_BINDING_CURL = `curl -X POST http://localhost:8000/v1/business-bindings \\
  -H "Content-Type: application/json" \\
  -d '{
    "id": "bb_algeria_fintech_01",
    "business_name": "Numidia Pay Fintech",
    "sector": "banking_fintech",
    "settlement": "instant_wire",
    "declared_threats": ["account_takeover", "unauthorized_disbursement"],
    "risk_appetite": "strict"
  }'`
