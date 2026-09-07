import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { AvailabilitySlot, Court, Reservation } from '../types/court'
import {
  dayRangeUtc,
  formatTime,
  slotEnd,
  slotsForDate,
  todayIsoDate,
} from '../lib/scheduling'

interface CellState {
  key: string
  courtId: string
  slot: Date
  isPast: boolean
  takenByOther: boolean
  mine: Reservation | null
}

export default function Book() {
  const { user } = useAuth()
  const [date, setDate] = useState(todayIsoDate())
  const [courts, setCourts] = useState<Court[]>([])
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([])
  const [mine, setMine] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingKey, setPendingKey] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('courts')
      .select('*')
      .eq('is_active', true)
      .order('number')
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setCourts(data as Court[])
      })
  }, [])

  const loadDay = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    const { start, end } = dayRangeUtc(date)

    const [availRes, mineRes] = await Promise.all([
      supabase
        .from('court_availability')
        .select('court_id,start_time,end_time')
        .gte('start_time', start)
        .lt('start_time', end),
      supabase
        .from('reservations')
        .select('*')
        .eq('member_id', user.id)
        .gte('start_time', start)
        .lt('start_time', end),
    ])

    if (availRes.error) setError(availRes.error.message)
    else setAvailability(availRes.data as AvailabilitySlot[])

    if (mineRes.error) setError(mineRes.error.message)
    else setMine(mineRes.data as Reservation[])

    setLoading(false)
  }, [date, user])

  useEffect(() => {
    loadDay()
  }, [loadDay])

  function cellFor(courtId: string, slot: Date): CellState {
    const key = `${courtId}_${slot.getTime()}`
    const takenByOther = availability.some(
      (a) =>
        a.court_id === courtId &&
        new Date(a.start_time).getTime() === slot.getTime(),
    )
    const mineMatch =
      mine.find(
        (r) =>
          r.court_id === courtId &&
          new Date(r.start_time).getTime() === slot.getTime() &&
          r.status !== 'cancelled',
      ) ?? null
    return {
      key,
      courtId,
      slot,
      isPast: slot.getTime() < Date.now(),
      takenByOther: takenByOther && !mineMatch,
      mine: mineMatch,
    }
  }

  async function handleBook(courtId: string, slot: Date) {
    if (!user) return
    const key = `${courtId}_${slot.getTime()}`
    setPendingKey(key)
    setError(null)
    const { error } = await supabase.from('reservations').insert({
      court_id: courtId,
      member_id: user.id,
      start_time: slot.toISOString(),
      end_time: slotEnd(slot).toISOString(),
    })
    setPendingKey(null)
    if (error) {
      if (error.code === '23P01') {
        setError('That slot was just booked by someone else — pick another.')
      } else {
        setError(error.message)
      }
      return
    }
    await loadDay()
  }

  async function handleCancel(reservationId: string) {
    setPendingKey(reservationId)
    setError(null)
    const { error } = await supabase.rpc('cancel_reservation', {
      p_reservation_id: reservationId,
    })
    setPendingKey(null)
    if (error) {
      setError(error.message)
      return
    }
    await loadDay()
  }

  const slots = slotsForDate(date)

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">
          Book a Court
        </h1>
        <input
          type="date"
          value={date}
          min={todayIsoDate()}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        />
      </div>

      {error && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-6 text-sm text-slate-500">Loading availability…</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[900px] border-separate border-spacing-1 text-sm">
            <thead>
              <tr>
                <th className="w-20 text-left text-xs font-medium text-slate-500">
                  Time
                </th>
                {courts.map((c) => (
                  <th
                    key={c.id}
                    className="text-center text-xs font-medium text-slate-500"
                  >
                    {c.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slots.map((slot) => (
                <tr key={slot.getTime()}>
                  <td className="pr-2 text-xs font-medium text-slate-500">
                    {formatTime(slot)}
                  </td>
                  {courts.map((court) => {
                    const cell = cellFor(court.id, slot)
                    const isPending = pendingKey === cell.key
                    if (cell.mine) {
                      const canCancel =
                        !cell.isPast &&
                        (cell.mine.status === 'booked' ||
                          cell.mine.status === 'confirmed')
                      return (
                        <td key={court.id} className="p-0">
                          <button
                            disabled={!canCancel || pendingKey === cell.mine.id}
                            onClick={() => handleCancel(cell.mine!.id)}
                            title={canCancel ? 'Click to cancel' : cell.mine.status}
                            className="h-12 w-full rounded-md bg-emerald-100 text-xs font-medium text-emerald-800 hover:bg-emerald-200 disabled:cursor-default disabled:opacity-70"
                          >
                            {pendingKey === cell.mine.id
                              ? '…'
                              : canCancel
                                ? 'Yours (cancel)'
                                : cell.mine.status}
                          </button>
                        </td>
                      )
                    }
                    if (cell.isPast) {
                      return (
                        <td key={court.id} className="p-0">
                          <div className="h-12 rounded-md bg-slate-100" />
                        </td>
                      )
                    }
                    if (cell.takenByOther) {
                      return (
                        <td key={court.id} className="p-0">
                          <div className="flex h-12 items-center justify-center rounded-md bg-slate-200 text-xs text-slate-500">
                            Booked
                          </div>
                        </td>
                      )
                    }
                    return (
                      <td key={court.id} className="p-0">
                        <button
                          disabled={isPending}
                          onClick={() => handleBook(court.id, slot)}
                          className="h-12 w-full rounded-md border border-dashed border-emerald-300 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                        >
                          {isPending ? '…' : 'Book'}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
