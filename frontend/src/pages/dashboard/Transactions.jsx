import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { VC, fmt } from '../../lib/trace'

const BANDS = ['ALL', 'APPROVE', 'REVIEW', 'HOLD', 'REJECT']

export default function Transactions() {
  const navigate = useNavigate()
  const [txs, setTxs] = useState(null)
  const [error, setError] = useState(null)
  const [band, setBand] = useState('ALL')

  useEffect(() => {
    api
      .listTransactions({ decision: band === 'ALL' ? undefined : band, limit: 200 })
      .then(setTxs)
      .catch((e) => setError(e.message))
  }, [band])

  return (
    <div>
      <div className="mb-1 font-mono text-[10px] tracking-[0.24em] text-ink/42">DASHBOARD · TRANSACTIONS</div>
      <h1 className="m-0 font-display text-[clamp(26px,3vw,36px)] font-extrabold tracking-[-0.02em]">
        Verdict history.
      </h1>

      <div className="mt-5 flex flex-wrap gap-2">
        {BANDS.map((b) => (
          <button
            key={b}
            onClick={() => setBand(b)}
            className={`cursor-pointer rounded-sm border px-3 py-1.5 font-mono text-[11px] tracking-[0.08em] transition-colors ${
              band === b ? 'border-ink bg-ink text-paper' : 'border-ink/20 bg-transparent text-ink/60 hover:border-ink/50'
            }`}
          >
            {b}
          </button>
        ))}
      </div>

      {error ? (
        <p className="mt-4 rounded border border-rust/30 bg-rust/[0.06] p-4 text-sm text-rust-dark">
          Couldn't reach the API ({error}).
        </p>
      ) : null}

      <div className="mt-5 overflow-x-auto rounded border border-ink/14">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-ink/14 bg-white/50 text-left font-mono text-[10.5px] tracking-[0.1em] text-ink/45">
              <th className="px-4 py-3 font-medium">DECISION</th>
              <th className="px-4 py-3 font-medium">AMOUNT</th>
              <th className="px-4 py-3 font-medium">COUNTERPARTY</th>
              <th className="px-4 py-3 font-medium">SCORE</th>
              <th className="px-4 py-3 font-medium">UNITS</th>
              <th className="px-4 py-3 font-medium">WHEN</th>
            </tr>
          </thead>
          <tbody>
            {(txs || []).map((t) => {
              const v = t.response?.verdict
              return (
                <tr
                  key={t.id}
                  className="cursor-pointer border-b border-ink/8 bg-white/20 transition-colors hover:bg-white/50"
                  onClick={() => navigate(`/dashboard/transactions/${t.id}`)}
                >
                  <td className="px-4 py-3">
                    <Link
                      to={`/dashboard/transactions/${t.id}`}
                      className="rounded-sm border-2 px-2 py-0.5 font-mono text-[10.5px] font-bold no-underline"
                      style={{ borderColor: VC[v?.decision], color: VC[v?.decision] }}
                    >
                      {v?.decision}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-[13px] text-ink">
                    {fmt(t.event?.amount?.value || 0)} {t.event?.amount?.currency}
                  </td>
                  <td className="px-4 py-3 font-mono text-[12px] text-ink/60">{t.event?.counterparty?.msisdn}</td>
                  <td className="px-4 py-3 font-mono text-[12px] text-ink/60">{v?.score}</td>
                  <td className="px-4 py-3 font-mono text-[12px] text-ink/60">
                    {v?.cost_units_spent}/{v?.budget_allocated}
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-ink/40">
                    {new Date(t.timestamp).toLocaleString()}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {txs && txs.length === 0 ? (
          <div className="p-8 text-center font-mono text-xs text-ink/40">// no transactions in this band</div>
        ) : null}
      </div>
    </div>
  )
}
