export const KIND = {
  THINK: { bg: 'rgba(232,228,216,0.10)', fg: 'rgba(232,228,216,0.72)', color: 'rgba(232,228,216,0.9)' },
  CALL: { bg: 'rgba(159,184,216,0.16)', fg: '#9fb8d8', color: 'rgba(232,228,216,0.78)' },
  OBSERVE: { bg: 'rgba(143,191,159,0.16)', fg: '#8fbf9f', color: 'rgba(232,228,216,0.68)' },
  FLAG: { bg: 'rgba(178,58,42,0.24)', fg: '#e8877a', color: '#f0b9b0' },
}

export const VC = { APPROVE: '#8fbf9f', REVIEW: '#d8b25a', HOLD: '#e8877a', REJECT: '#b23a2a' }

export const fmt = (n) => n.toLocaleString('en-US')

export function buildPlan(amount, newCp, geoMatch) {
  let risk = 0
  if (amount > 60000) risk += 2
  else if (amount > 15000) risk += 1
  if (newCp) risk += 2
  if (!geoMatch) risk += 2
  const budget = Math.min(3 + risk, 10)
  const s = []
  s.push({
    kind: 'THINK',
    pre: 240,
    text:
      fmt(amount) +
      ' DZD. Counterparty ' +
      (newCp ? 'unknown to the registry' : 'seen 14x before') +
      '. Session ' +
      (geoMatch ? 'matches home cell 16-ALG' : 'is 412 km from home cell') +
      '. Budget allocated: ' +
      budget +
      ' units.',
  })
  s.push({ kind: 'CALL', pre: 300, cost: 1, text: 'bind.device_check({ msisdn: "+213xxxxx4417" })' })
  s.push({
    kind: 'OBSERVE',
    pre: 620,
    text: '{ "bound": true, "attestation": 0.99, "sim_changed_at": ' + (geoMatch ? 'null' : '"14h ago"') + ' }',
  })
  if (!geoMatch) {
    s.push({
      kind: 'FLAG',
      pre: 420,
      text: 'The device is bound, but the identity underneath it moved 14 hours ago. Buying the expensive signal.',
    })
    s.push({ kind: 'CALL', pre: 280, cost: 2, text: 'network.sim_swap_probe({ window: "72h" })' })
    s.push({
      kind: 'OBSERVE',
      pre: 880,
      text: '{ "swap_confirmed": true, "port_out": true, "new_imei": true, "carrier_ticket": "PO-88134" }',
    })
  }
  s.push({ kind: 'CALL', pre: 300, cost: 1, text: 'registry.counterparty_lookup({ id: "cp_9f21" })' })
  s.push({
    kind: 'OBSERVE',
    pre: 560,
    text: newCp
      ? '{ "trust": 0.11, "first_seen": "6h ago", "inbound_strangers_7d": 43, "cluster": "MC-7734" }'
      : '{ "trust": 0.94, "first_seen": "2024-03-11", "prior_transfers": 14, "cluster": null }',
  })
  if (!geoMatch) {
    s.push({ kind: 'CALL', pre: 260, cost: 1, text: 'geo.session_match({ cell: "31-ORN" })' })
    s.push({
      kind: 'OBSERVE',
      pre: 500,
      text: '{ "home_cell": "16-ALG", "delta_km": 412, "travel_plausible": false }',
    })
  }
  if (amount > 60000) {
    s.push({ kind: 'CALL', pre: 260, cost: 2, text: 'velocity.window_scan({ window: "1h" })' })
    s.push({
      kind: 'OBSERVE',
      pre: 640,
      text: '{ "attempts": 4, "cumulative_dzd": ' + fmt(amount + 61000) + ', "pct_of_balance": 0.91 }',
    })
  }
  const verdict = risk >= 5 ? 'HOLD' : risk >= 2 ? 'REVIEW' : 'APPROVE'
  const note =
    verdict === 'HOLD'
      ? 'Independent signals agree: the account is no longer the person. Held pending re-binding.'
      : verdict === 'REVIEW'
        ? 'One signal is off but the binding holds. Routed to a human with the trace attached.'
        : 'Nothing to escalate. Closed cheap, as it should be.'
  s.push({
    kind: 'THINK',
    pre: 420,
    text:
      verdict === 'APPROVE'
        ? 'Cheap answers agree. Stopping before the budget is spent.'
        : 'Signals are independent and they point the same way. Closing.',
  })
  return { steps: s, budget, verdict, note, risk }
}

export const CASES = [
  {
    id: 'CASE A',
    title: 'Payroll, Tuesday, 09:12',
    tag: 'ROUTINE',
    subject: 'subject: +213xxxxx1092 -> cp_0041 · 42,000 DZD',
    steps: [
      { kind: 'THINK', pre: 200, text: '42,000 DZD to an employer-side account seen every month since March 2024. Budget: 3 units.' },
      { kind: 'CALL', pre: 260, cost: 1, text: 'bind.device_check({})' },
      { kind: 'OBSERVE', pre: 520, text: '{ "bound": true, "attestation": 0.99, "sim_changed_at": null }' },
      { kind: 'CALL', pre: 240, cost: 1, text: 'registry.counterparty_lookup({ id: "cp_0041" })' },
      { kind: 'OBSERVE', pre: 480, text: '{ "trust": 0.97, "prior_transfers": 29, "cluster": null }' },
      { kind: 'THINK', pre: 380, text: 'Two cheap questions, two clean answers. Spending more here would be theatre.' },
    ],
    verdict: 'APPROVE',
    units: 2,
    note: '2 units. The boring case has to be cheap or the whole budget idea collapses.',
  },
  {
    id: 'CASE B',
    title: 'A six-hour-old account asks for 184,000 DZD',
    tag: 'ESCALATION',
    subject: 'subject: +213xxxxx4417 -> cp_9f21 · 184,000 DZD · 03:12 local',
    steps: [
      { kind: 'THINK', pre: 200, text: '184,000 DZD, 91% of balance, counterparty unknown. Password was correct. Budget: 8 units.' },
      { kind: 'CALL', pre: 260, cost: 1, text: 'bind.device_check({})' },
      { kind: 'OBSERVE', pre: 600, text: '{ "bound": true, "attestation": 0.98, "sim_changed_at": "14h ago" }' },
      { kind: 'FLAG', pre: 460, text: 'Bound, but the SIM moved 14 hours ago. A correct password proves nothing about who holds the number now.' },
      { kind: 'CALL', pre: 280, cost: 2, text: 'network.sim_swap_probe({ window: "72h" })' },
      { kind: 'OBSERVE', pre: 900, text: '{ "swap_confirmed": true, "port_out": true, "new_imei": true, "carrier_ticket": "PO-88134" }' },
      { kind: 'CALL', pre: 260, cost: 2, text: 'registry.counterparty_lookup({ id: "cp_9f21" })' },
      { kind: 'OBSERVE', pre: 620, text: '{ "trust": 0.11, "first_seen": "6h ago", "inbound_strangers_7d": 43, "cluster": "MC-7734" }' },
      { kind: 'CALL', pre: 240, cost: 1, text: 'geo.session_match({ cell: "31-ORN" })' },
      { kind: 'OBSERVE', pre: 520, text: '{ "home_cell": "16-ALG", "delta_km": 412, "travel_plausible": false }' },
      { kind: 'CALL', pre: 240, cost: 1, text: 'velocity.window_scan({ window: "1h" })' },
      { kind: 'OBSERVE', pre: 560, text: '{ "attempts": 4, "escalating": true, "pct_of_balance": 0.91 }' },
      { kind: 'THINK', pre: 420, text: 'Four independent sources, none of them the customer. Hold and force re-binding.' },
    ],
    verdict: 'HOLD',
    units: 7,
    note: '7 units. Held 61 seconds after the first tap — before the transfer cleared.',
  },
  {
    id: 'CASE C',
    title: '96,000 DZD at 03:40 — and it let it through',
    tag: 'FALSE POSITIVE AVOIDED',
    subject: 'subject: +213xxxxx7730 -> cp_self_2 · 96,000 DZD · 03:40 local',
    steps: [
      { kind: 'THINK', pre: 200, text: 'Large, nocturnal, unusual hour. Every fixed rule set flags this. Budget: 6 units.' },
      { kind: 'CALL', pre: 260, cost: 1, text: 'bind.device_check({})' },
      { kind: 'OBSERVE', pre: 560, text: '{ "bound": true, "bound_since": "2023-04-02", "sim_changed_at": null }' },
      { kind: 'CALL', pre: 240, cost: 1, text: 'registry.counterparty_lookup({ id: "cp_self_2" })' },
      { kind: 'OBSERVE', pre: 540, text: '{ "same_owner": true, "kyc_match": 1.0, "prior_transfers": 7 }' },
      { kind: 'CALL', pre: 240, cost: 1, text: 'geo.session_match({ cell: "16-ALG" })' },
      { kind: 'OBSERVE', pre: 480, text: '{ "home_cell": "16-ALG", "delta_km": 0.4 }' },
      { kind: 'THINK', pre: 400, text: 'Own device, own second account, own cell. The hour is not a signal — it is a habit.' },
    ],
    verdict: 'APPROVE',
    units: 3,
    note: '3 units. Blocking this would have cost the bank a customer and caught nobody.',
  },
]
