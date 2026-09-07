import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Profile, Role } from '../types/profile'

export default function MembersPanel() {
  const { user } = useAuth()
  const [members, setMembers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name')
    if (error) setError(error.message)
    else setMembers(data as Profile[])
    setLoading(false)
  }

  async function setRole(id: string, role: Role) {
    setPendingId(id)
    setError(null)
    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', id)
    setPendingId(null)
    if (error) setError(error.message)
    else await load()
  }

  async function setActive(id: string, is_active: boolean) {
    setPendingId(id)
    setError(null)
    const { error } = await supabase
      .from('profiles')
      .update({ is_active })
      .eq('id', id)
    setPendingId(null)
    if (error) setError(error.message)
    else await load()
  }

  if (loading) return <p className="mt-3 text-sm text-slate-500">Loading…</p>

  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        Members
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        Be careful not to remove your own admin role — there's no
        self-recovery flow yet.
      </p>
      {error && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[600px] border-separate border-spacing-y-1 text-sm">
          <thead>
            <tr className="text-left text-xs font-medium text-slate-500">
              <th className="px-2">Name</th>
              <th className="px-2">Email</th>
              <th className="px-2">Role</th>
              <th className="px-2">No-shows</th>
              <th className="px-2">Active</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const isPending = pendingId === m.id
              return (
                <tr key={m.id} className="bg-white shadow-sm">
                  <td className="px-2 py-1.5 font-medium text-slate-900">
                    {m.full_name || '—'}
                    {m.id === user?.id && (
                      <span className="ml-1 text-xs text-slate-400">
                        (you)
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-slate-600">{m.email}</td>
                  <td className="px-2 py-1.5">
                    <select
                      value={m.role}
                      disabled={isPending}
                      onChange={(e) =>
                        setRole(m.id, e.target.value as Role)
                      }
                      className="rounded border border-slate-300 px-2 py-1 text-sm"
                    >
                      <option value="member">member</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td className="px-2 py-1.5 text-slate-600">
                    {m.no_show_count}
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="checkbox"
                      checked={m.is_active}
                      disabled={isPending}
                      onChange={(e) => setActive(m.id, e.target.checked)}
                    />
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
