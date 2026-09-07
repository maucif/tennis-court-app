import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Reservation, ReservationStatus } from '../types/court'
import { dayRangeUtc, formatTime, todayIsoDate } from '../lib/scheduling'

interface Row extends Reservation {
  courts: { number: number } | null
  profiles: { full_name: string | null; email: string | null } | null
}

function statusBadge(status: ReservationStatus) {
  const styles: Record<ReservationStatus, string> = {
    booked: 'bg-slate-100 text-slate-700',
    confirmed: 'bg-emerald-100 text-emerald-800',
    completed: 'bg-blue-100 text-blue-800',
    no_show: 'bg-red-100 text-red-700',
    cancelled: 'bg-slate-100 text-slate-400',
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  )
}

export default function ReservationsOverridePanel() {
  const [date, setDate] = useState(todayIsoDate())
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { start, end } = dayRangeUtc(date)
    const { data, error } = await supabase
      .from('reservations')
      .select('*, courts(number), profiles!reservations_member_id_fkey(full_name, email)')
      .gte('start_time', start)
      .lt('start_time', end)
      .order('start_time')
    if (error) setError(error.message)
    else setRows(data as unknown as Row[])
    setLoading(false)
  }, [date])

  useEffect(() => {
    load()
  }, [load])

  async function updateStatus(
    id: string,
    patch: Partial<Pick<Reservation, 'status' | 'confirmed_at' | 'validated_at'>>,
  ) {
    setPendingId(id)
    setError(null)
    const { error } = await supabase
      .from('reservations')
      .update(patch)
      .eq('id', id)
    setPendingId(null)
    if (error) setError(error.message)
    else await load()
  }

  async function markNoShow(id: string) {
    setPendingId(id)
    setError(null)
    const { error } = await supabase.rpc('admin_mark_no_show', {
      p_reservation_id: id,
    })
    setPendingId(null)
    if (error) setError(error.message)
    else await load()
  }

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Reservations (manual override)
        </h2>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-md border border-slate-300 px-2 py-1 text-sm"
        />
      </div>
      <p className="mt-1 text-xs text-slate-500">
        For edge cases — e.g. confirming or checking someone in when their
        phone can't do it (dead battery, no signal at the club).
      </p>

      {error && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-3 text-sm text-slate-500">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">
          No reservations on this date.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((r) => {
            const isPending = pendingId === r.id
            const canAct = r.status === 'booked' || r.status === 'confirmed'
            return (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm"
              >
                <div>
                  <div className="font-medium text-slate-900">
                    Court {r.courts?.number} — {formatTime(new Date(r.start_time))}
                  </div>
                  <div className="text-slate-500">
                    {r.profiles?.full_name || r.profiles?.email || '—'}
                  </div>
                  <div className="mt-1">{statusBadge(r.status)}</div>
                </div>
                {canAct && (
                  <div className="flex flex-wrap gap-1.5">
                    {r.status === 'booked' && (
                      <button
                        disabled={isPending}
                        onClick={() =>
                          updateStatus(r.id, {
                            status: 'confirmed',
                            confirmed_at: new Date().toISOString(),
                          })
                        }
                        className="rounded-md bg-emerald-700 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
                      >
                        Confirm
                      </button>
                    )}
                    <button
                      disabled={isPending}
                      onClick={() =>
                        updateStatus(r.id, {
                          status: 'completed',
                          validated_at: new Date().toISOString(),
                        })
                      }
                      className="rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                      Check in
                    </button>
                    <button
                      disabled={isPending}
                      onClick={() => updateStatus(r.id, { status: 'cancelled' })}
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      disabled={isPending}
                      onClick={() => markNoShow(r.id)}
                      className="rounded-md border border-red-300 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      Mark no-show
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
