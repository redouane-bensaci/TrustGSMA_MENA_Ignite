const ENDPOINTS = [
  {
    group: 'Auth',
    routes: [
      { method: 'POST', path: '/v1/auth/signup', desc: 'Create an account and a tenant shell.' },
      { method: 'POST', path: '/v1/auth/login', desc: 'Exchange email + password for a bearer token.' },
      { method: 'GET', path: '/v1/auth/me', desc: 'Resolve the current session to a user record.' },
    ],
  },
  {
    group: 'Business bindings',
    routes: [
      {
        method: 'POST',
        path: '/v1/business-bindings',
        desc: 'Create the tenant context: sector, transaction types, value bands, risk appetite, declared threats, friction policy.',
      },
      { method: 'GET', path: '/v1/business-bindings/{id}', desc: 'Fetch tenant context — used by the agent at decision time.' },
      { method: 'PATCH', path: '/v1/business-bindings/{id}', desc: 'Edit tenant context. Backs the dashboard settings page.' },
    ],
  },
  {
    group: 'Verification',
    routes: [
      {
        method: 'POST',
        path: '/v1/verify',
        desc: 'The core decision endpoint. Body is the transaction event only — amount, currency, counterparty (msisdn, declared_name, declared_location), channel, idempotency key. Business binding and counterparty history are fetched server-side, never accepted from the caller. Returns the machine verdict, a merchant instruction, and the counterparty_history the agent actually reasoned from.',
        highlight: true,
      },
      {
        method: 'GET',
        path: '/v1/counterparty-history/{msisdn}',
        desc: 'The same anti-tampering history lookup the agent uses internally, exposed read-only — preview what evidence an MSISDN carries before running a full verification.',
      },
    ],
  },
  {
    group: 'Transactions',
    routes: [
      { method: 'GET', path: '/v1/transactions', desc: 'List past verdicts. Paginated, filterable by decision band.' },
      { method: 'GET', path: '/v1/transactions/{id}', desc: 'Single verdict with full signal attribution. Backs the transaction detail page.' },
    ],
  },
  {
    group: 'Tool registry',
    routes: [{ method: 'GET', path: '/v1/tools', desc: 'Read-only list of the seven CAMARA tools available to the agent.' }],
  },
]

const METHOD_COLOR = {
  GET: '#8fbf9f',
  POST: '#9fb8d8',
  PATCH: '#d8b25a',
}

export default function ApiReference() {
  return (
    <div>
      <div className="mb-3 font-mono text-[10px] tracking-[0.24em] text-ink/42">DOCS / API REFERENCE</div>
      <h1 className="m-0 font-display text-[clamp(26px,3.6vw,40px)] font-extrabold tracking-[-0.03em]">
        Every route your integration touches.
      </h1>
      <p className="mt-3 max-w-[62ch] text-wrap-pretty text-base leading-relaxed text-ink/65">
        Hand-written for the hackathon deadline — an OpenAPI-generated version is on the roadmap.
        Everything here is also live at{' '}
        <code className="rounded-sm bg-panel px-1.5 py-0.5 font-mono text-[13px] text-cream">/docs</code> on the API
        server itself (FastAPI's interactive Swagger UI).
      </p>

      <div className="mt-8 flex flex-col gap-8">
        {ENDPOINTS.map((group) => (
          <div key={group.group}>
            <h2 className="font-display text-lg font-semibold tracking-[-0.01em] text-ink">{group.group}</h2>
            <div className="mt-3 flex flex-col gap-2">
              {group.routes.map((r) => (
                <div
                  key={`${r.method}-${r.path}`}
                  className={`rounded border p-4 ${r.highlight ? 'border-rust/40 bg-rust/[0.04]' : 'border-ink/14 bg-white/40'}`}
                >
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span
                      className="rounded-sm px-2 py-0.5 font-mono text-[10.5px] font-semibold tracking-[0.08em]"
                      style={{ background: `${METHOD_COLOR[r.method]}22`, color: METHOD_COLOR[r.method] }}
                    >
                      {r.method}
                    </span>
                    <span className="font-mono text-[13px] text-ink">{r.path}</span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-ink/62">{r.desc}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
