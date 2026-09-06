import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Reservation } from '../types/court'
import { formatTime } from '../lib/scheduling'

interface Row extends Reservation {
  courts: { number: number; name: string } | null
}

const CONFIRM_WINDOW_MS = 60 * 60 * 1000

function formatDate(d: Date): string {
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function statusBadge(status: Reservation['status']) {
  const styles: Record<Reservation['status'], string> = {
    booked: 'bg-slate-100 text-slate-700',
    confirmed: 'bg-emerald-100 text-emerald-800',
    completed: 'bg-blue-100 text-blue-800',
    no_show: 'bg-red-100 text-red-700',
    cancelled: 'bg-slate-100 text-slate-400',
  }
  const labels: Record<Reservation['status'], string> = {
    booked: 'Booked',
    confirmed: 'Confirmed',
    completed: 'Completed',
    no_show: 'No-show',
    cancelled: 'Cancelled',
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}

export default function MyReservations() {
  const { user } = useAuth()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [now, setNow] = useState(Date.now())

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('reservations')
      .select('*, courts(number, name)')
      .eq('member_id', user.id)
      .order('start_time', { ascending: false })
    if (error) setError(error.message)
    else setRows(data as Row[])
    setLoading(false)
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  // Keep confirm-window eligibility fresh without a manual refresh.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  async function handleConfirm(id: string) {
    setPendingId(id)
    setError(null)
    const { error } = await supabase.rpc('confirm_reservation', {
      p_reservation_id: id,
    })
    setPendingId(null)
    if (error) setError(error.message)
    else await load()
  }

  async function handleCancel(id: string) {
    setPendingId(id)
    setError(null)
    const { error } = await supabase.rpc('cancel_reservation', {
      p_reservation_id: id,
    })
    setPendingId(null)
    if (error) setError(error.message)
    else await load()
  }

  const upcoming = rows
    .filter((r) => r.status !== 'cancelled' && new Date(r.end_time).getTime() > now)
    .sort((a, b) => a.start_time.localeCompare(b.start_time))
  const history = rows
    .filter((r) => r.status === 'cancelled' || new Date(r.end_time).getTime() <= now)

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">
        My Reservations
      </h1>

      {error && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-6 text-sm text-slate-500">Loading…</p>
      ) : (
        <>
          <section className="mt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Upcoming
            </h2>
            {upcoming.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">
                No upcoming reservations. Go book a court!
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {upcoming.map((r) => {
                  const start = new Date(r.start_time)
                  const msUntilStart = start.getTime() - now
                  const canConfirm =
                    r.status === 'booked' && msUntilStart <= CONFIRM_WINDOW_MS
                  const canCancel =
                    (r.status === 'booked' || r.status === 'confirmed') &&
                    msUntilStart > 0
                  const isPending = pendingId === r.id

                  return (
                    <li
                      key={r.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div>
                        <div className="font-medium text-slate-900">
                          Court {r.courts?.number} — {formatDate(start)} at{' '}
                          {formatTime(start)}
                        </div>
                        <div className="mt-1">{statusBadge(r.status)}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {r.status === 'booked' && !canConfirm && (
                          <span className="text-xs text-slate-500">
                            Confirm opens 1hr before
                          </span>
                        )}
                        {canConfirm && (
                          <button
                            disabled={isPending}
                            onClick={() => handleConfirm(r.id)}
                            className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
                          >
                            {isPending ? '…' : 'Confirm'}
                          </button>
                        )}
                        {r.status === 'confirmed' && msUntilStart <= 0 && (
                          <span className="text-xs text-slate-500">
                            On-site check-in coming soon
                          </span>
                        )}
                        {canCancel && (
                          <button
                            disabled={isPending}
                            onClick={() => handleCancel(r.id)}
                            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              History
            </h2>
            {history.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">Nothing here yet.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {history.map((r) => {
                  const start = new Date(r.start_time)
                  return (
                    <li
                      key={r.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm"
                    >
                      <div className="text-slate-600">
                        Court {r.courts?.number} — {formatDate(start)} at{' '}
                        {formatTime(start)}
                      </div>
                      {statusBadge(r.status)}
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}
