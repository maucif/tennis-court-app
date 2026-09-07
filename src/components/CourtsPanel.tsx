import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Court } from '../types/court'

export default function CourtsPanel() {
  const [courts, setCourts] = useState<Court[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, Partial<Court>>>({})

  useEffect(() => {
    supabase
      .from('courts')
      .select('*')
      .order('number')
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setCourts(data as Court[])
        setLoading(false)
      })
  }, [])

  function draftFor(court: Court): Court {
    return { ...court, ...drafts[court.id] }
  }

  function updateDraft(id: string, patch: Partial<Court>) {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }))
  }

  async function save(court: Court) {
    const draft = draftFor(court)
    setSavingId(court.id)
    setError(null)
    const { error } = await supabase
      .from('courts')
      .update({
        name: draft.name,
        latitude: draft.latitude,
        longitude: draft.longitude,
        is_active: draft.is_active,
      })
      .eq('id', court.id)
    setSavingId(null)
    if (error) {
      setError(error.message)
      return
    }
    setCourts((prev) => prev.map((c) => (c.id === court.id ? draft : c)))
    setDrafts((prev) => {
      const next = { ...prev }
      delete next[court.id]
      return next
    })
  }

  if (loading) return <p className="mt-3 text-sm text-slate-500">Loading…</p>

  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        Courts
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        Latitude/longitude only matter if GPS on-site validation gets added
        later — safe to leave as placeholders for now.
      </p>
      {error && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[640px] border-separate border-spacing-y-1 text-sm">
          <thead>
            <tr className="text-left text-xs font-medium text-slate-500">
              <th className="px-2">#</th>
              <th className="px-2">Name</th>
              <th className="px-2">Latitude</th>
              <th className="px-2">Longitude</th>
              <th className="px-2">Active</th>
              <th className="px-2"></th>
            </tr>
          </thead>
          <tbody>
            {courts.map((court) => {
              const draft = draftFor(court)
              const dirty = !!drafts[court.id]
              return (
                <tr key={court.id} className="bg-white shadow-sm">
                  <td className="px-2 py-1.5 text-slate-500">{court.number}</td>
                  <td className="px-2 py-1.5">
                    <input
                      value={draft.name}
                      onChange={(e) =>
                        updateDraft(court.id, { name: e.target.value })
                      }
                      className="w-32 rounded border border-slate-300 px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="number"
                      step="any"
                      value={draft.latitude}
                      onChange={(e) =>
                        updateDraft(court.id, {
                          latitude: Number(e.target.value),
                        })
                      }
                      className="w-24 rounded border border-slate-300 px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="number"
                      step="any"
                      value={draft.longitude}
                      onChange={(e) =>
                        updateDraft(court.id, {
                          longitude: Number(e.target.value),
                        })
                      }
                      className="w-24 rounded border border-slate-300 px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <input
                      type="checkbox"
                      checked={draft.is_active}
                      onChange={(e) =>
                        updateDraft(court.id, { is_active: e.target.checked })
                      }
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <button
                      disabled={!dirty || savingId === court.id}
                      onClick={() => save(court)}
                      className="rounded-md bg-slate-900 px-3 py-1 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-40"
                    >
                      {savingId === court.id ? '…' : 'Save'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
