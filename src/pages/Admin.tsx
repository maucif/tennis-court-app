import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Admin() {
  const [code, setCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

      <section className="mt-6 max-w-sm rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Today's check-in code
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Share this with members at the club (not through the app) so they
          can check in once they're on the court.
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

      <p className="mt-6 text-sm text-slate-500">
        Court/member management and the no-show fee list will go here (Steps
        7–9).
      </p>
    </div>
  )
}
