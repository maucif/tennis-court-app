import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, profile, loading, signOut } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading…</div>
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  if (profile && !profile.is_active) {
    return (
      <div className="mx-auto mt-16 max-w-sm text-center">
        <h1 className="text-xl font-semibold text-slate-900">
          Account deactivated
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Your account has been deactivated by the club admin. Contact them
          if you think this is a mistake.
        </p>
        <button
          onClick={() => signOut()}
          className="mt-4 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Sign out
        </button>
      </div>
    )
  }

  return <>{children}</>
}

export function AdminRoute({ children }: { children: ReactNode }) {
  const { profile, loading } = useAuth()

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading…</div>
  }

  if (profile?.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
