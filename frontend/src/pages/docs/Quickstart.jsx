import { Link } from 'react-router-dom'
import CodeBlock from '../../components/CodeBlock'
import { VERIFY_CURL, VERIFY_RESPONSE } from '../../lib/apiExamples'

export default function Quickstart() {
  return (
    <div>
      <div className="mb-3 font-mono text-[10px] tracking-[0.24em] text-ink/42">DOCS / QUICKSTART</div>
      <h1 className="m-0 font-display text-[clamp(26px,3.6vw,40px)] font-extrabold tracking-[-0.03em]">
        Your first verdict, in one call.
      </h1>
      <p className="mt-3 max-w-[62ch] text-wrap-pretty text-base leading-relaxed text-ink/65">
        No API key is required against the sandbox — every request is scored by the same reasoning
        loop and deterministic floor that runs in production. The body is the transaction event
        only; TRUST fetches the business binding and counterparty history itself, server-side.
      </p>

      <h2 className="mt-8 font-display text-xl font-semibold tracking-[-0.01em]">1. Send a transaction</h2>
      <div className="mt-3">
        <CodeBlock code={VERIFY_CURL} label="POST /v1/verify" />
      </div>

      <h2 className="mt-8 font-display text-xl font-semibold tracking-[-0.01em]">2. Read the verdict</h2>
      <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-ink/60">
        The response carries a machine-readable verdict (for your systems) and a merchant instruction
        (a one-sentence summary and a badge, meant for a human looking at a screen).
      </p>
      <div className="mt-3">
        <CodeBlock code={VERIFY_RESPONSE} label="200 OK" />
      </div>

      <h2 className="mt-8 font-display text-xl font-semibold tracking-[-0.01em]">3. Next steps</h2>
      <ul className="mt-3 flex flex-col gap-2 text-sm text-ink/65">
        <li>
          — Read the <Link to="/docs/api-reference" className="text-rust hover:text-rust-dark">full API reference</Link> for
          business bindings, transaction history, and the tool registry.
        </li>
        <li>
          — Try it without writing code in the <Link to="/playground" className="text-rust hover:text-rust-dark">playground</Link>.
        </li>
        <li>
          — <Link to="/signup" className="text-rust hover:text-rust-dark">Create an account</Link> to get a persistent business
          binding and a transaction history dashboard.
        </li>
      </ul>
    </div>
  )
}
