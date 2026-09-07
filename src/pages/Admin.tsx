import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import NoShowFeesPanel from '../components/NoShowFeesPanel'
import ReservationsOverridePanel from '../components/ReservationsOverridePanel'
import CourtsPanel from '../components/CourtsPanel'
import MembersPanel from '../components/MembersPanel'

const TABS = ['Overview', 'Reservations', 'Courts', 'Members'] as const
type Tab = (typeof TABS)[number]

export default function Admin() {
  const [tab, setTab] = useState<Tab>('Overview')
  const [code, setCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sendingReminders, setSendingReminders] = useState(false)
  const [reminderResult, setReminderResult] = useState<string | null>(null)

  async function sendRemindersNow() {
    setSendingReminders(true)
    setReminderResult(null)
    const { data, error } = await supabase.rpc('send_reservation_reminders')
    setSendingReminders(false)
    if (error) setReminderResult(`Error: ${error.message}`)
    else setReminderResult(`Sent ${data} reminder${data === 1 ? '' : 's'}.`)
  }

  useEffect(() => {
    supabase
      .rpc('get_or_create_today_code')
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setCode(data as string)
        setLoading(false)
      })
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Admin</h1>

      <div className="mt-4 flex gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm font-medium ${
              tab === t
                ? 'border-b-2 border-emerald-700 text-emerald-700'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && (
        <>
          <section className="mt-6 max-w-sm rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Today's check-in code
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Share this with members at the club (not through the app) so
              they can check in once they're on the court.
            </p>
            {loading ? (
              <p className="mt-3 text-sm text-slate-500">Loading…</p>
            ) : error ? (
              <p className="mt-3 text-sm text-red-600">{error}</p>
            ) : (
              <div className="mt-3 rounded-md bg-slate-900 px-4 py-3 text-center font-mono text-2xl tracking-[0.3em] text-white">
                {code}
              </div>
            )}
            <p className="mt-2 text-xs text-slate-400">
              A new code is created automatically the first time this page is
              opened each day.
            </p>
          </section>

          <section className="mt-8 max-w-sm rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Reminder emails
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Runs automatically every 5 minutes for reservations starting
              within the hour. This button is just for testing without
              waiting.
            </p>
            <button
              onClick={sendRemindersNow}
              disabled={sendingReminders}
              className="mt-3 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              {sendingReminders ? 'Sending…' : 'Send reminders now'}
            </button>
            {reminderResult && (
              <p className="mt-2 text-xs text-slate-600">{reminderResult}</p>
            )}
          </section>

          <NoShowFeesPanel />
        </>
      )}

      {tab === 'Reservations' && <ReservationsOverridePanel />}
      {tab === 'Courts' && <CourtsPanel />}
      {tab === 'Members' && <MembersPanel />}
    </div>
  )
}
