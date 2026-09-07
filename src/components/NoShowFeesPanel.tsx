import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { FeeStatus, NoShowFeeRow } from '../types/noShowFee'

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function downloadCsv(rows: NoShowFeeRow[]) {
  const header = ['Member', 'Email', 'Court', 'Date', 'Time', 'Status', 'Note']
  const lines = rows.map((r) => {
    const start = r.reservations ? new Date(r.reservations.start_time) : null
    return [
      r.profiles?.full_name ?? '',
      r.profiles?.email ?? '',
      r.reservations?.courts?.name ?? '',
      start ? start.toLocaleDateString() : '',
      start ? start.toLocaleTimeString() : '',
      r.status,
      r.note ?? '',
    ]
      .map((v) => csvEscape(String(v)))
      .join(',')
  })
  const csv = [header.join(','), ...lines].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `no-show-fees-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function NoShowFeesPanel() {
  const [rows, setRows] = useState<NoShowFeeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sweeping, setSweeping] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('no_show_fees')
      .select(
        `id, status, note, created_at, resolved_at,
         profiles!no_show_fees_member_id_fkey (full_name, email),
         reservations (start_time, end_time, courts (number, name))`,
      )
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setRows(data as unknown as NoShowFeeRow[])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function runSweep() {
    setSweeping(true)
    setError(null)
    const { error } = await supabase.rpc('run_no_show_sweep')
    setSweeping(false)
    if (error) setError(error.message)
    else await load()
  }

  async function setStatus(id: string, status: FeeStatus) {
    setPendingId(id)
    setError(null)
    const { error } = await supabase
      .from('no_show_fees')
      .update({ status, resolved_at: new Date().toISOString() })
      .eq('id', id)
    setPendingId(null)
    if (error) setError(error.message)
    else await load()
  }

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          No-show fees
        </h2>
        <div className="flex gap-2">
          <button
            onClick={runSweep}
            disabled={sweeping}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            {sweeping ? 'Running…' : 'Run sweep now'}
          </button>
          <button
            onClick={() => downloadCsv(rows)}
            disabled={rows.length === 0}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            Export CSV
          </button>
        </div>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        The sweep runs automatically every 5 minutes; "Run sweep now" is just
        for testing without waiting.
      </p>

      {error && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-3 text-sm text-slate-500">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">No no-shows on record.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[700px] border-separate border-spacing-y-1 text-sm">
            <thead>
              <tr className="text-left text-xs font-medium text-slate-500">
                <th className="px-2">Member</th>
                <th className="px-2">Court</th>
                <th className="px-2">When</th>
                <th className="px-2">Status</th>
                <th className="px-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const start = r.reservations
                  ? new Date(r.reservations.start_time)
                  : null
                const isPending = pendingId === r.id
                return (
                  <tr key={r.id} className="rounded-lg bg-white shadow-sm">
                    <td className="px-2 py-2">
                      <div className="font-medium text-slate-900">
                        {r.profiles?.full_name || r.profiles?.email || '—'}
                      </div>
                    </td>
                    <td className="px-2 py-2 text-slate-600">
                      {r.reservations?.courts?.name ?? '—'}
                    </td>
                    <td className="px-2 py-2 text-slate-600">
                      {start
                        ? `${start.toLocaleDateString()} ${start.toLocaleTimeString(
                            undefined,
                            { hour: 'numeric', minute: '2-digit' },
                          )}`
                        : '—'}
                    </td>
                    <td className="px-2 py-2">
                      <span
                        className={
                          r.status === 'pending'
                            ? 'rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800'
                            : r.status === 'charged'
                              ? 'rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700'
                              : 'rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500'
                        }
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      {r.status === 'pending' && (
                        <div className="flex gap-1.5">
                          <button
                            disabled={isPending}
                            onClick={() => setStatus(r.id, 'charged')}
                            className="rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                          >
                            Mark charged
                          </button>
                          <button
                            disabled={isPending}
                            onClick={() => setStatus(r.id, 'waived')}
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                          >
                            Waive
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
