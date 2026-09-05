export const VERIFY_CURL = `curl -X POST http://localhost:8000/v1/verify \\
  -H "Content-Type: application/json" \\
  -d '{
    "event_type": "transfer",
    "amount": { "value": 184000, "currency": "DZD" },
    "counterparty": {
      "msisdn": "+213661448899",
      "declared_location": { "cell": "31-ORN" }
    },
    "channel": "api",
    "idempotency_key": "idem_9f21a4",
    "business_binding_id": "bb_default_retail"
  }'`

export const VERIFY_RESPONSE = `{
  "transaction_id": "tx_7e2a9c1b04d1",
  "idempotency_key": "idem_9f21a4",
  "verdict": {
    "decision": "HOLD",
    "score": 22,
    "confidence": "high",
    "signals": [
      { "name": "verify_number", "status": "pass", "weight": 0.40, "cost_units": 1 },
      { "name": "get_device_status", "status": "pass", "weight": 0.20, "cost_units": 1 },
      { "name": "check_sim_swap", "status": "fail", "weight": 0.35, "cost_units": 2 },
      { "name": "verify_location", "status": "fail", "weight": 0.30, "cost_units": 1 }
    ],
    "cost_units_spent": 5,
    "budget_allocated": 8,
    "latency_ms": 612,
    "override_rule_fired": "RULE_2: Recent SIM swap under 24h on high-exposure event forces HOLD/REJECT"
  },
  "merchant_instruction": {
    "summary": "High risk detected: recent SIM swap combined with location or transaction anomaly.",
    "recommended_action": "Do not dispatch goods or release funds.",
    "headline_badge": "HOLD · DO NOT DISPATCH"
  },
  "timestamp": "2026-09-05T02:14:08.331Z"
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
