import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Layout() {
  const { profile, user, signOut } = useAuth()

  const navItems = [
    { to: '/', label: 'Book a Court' },
    { to: '/my-reservations', label: 'My Reservations' },
    ...(profile?.role === 'admin' ? [{ to: '/admin', label: 'Admin' }] : []),
  ]

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <span className="text-lg font-semibold text-emerald-700">
            🎾 Court Reserve
          </span>
          <nav className="flex items-center gap-4 text-sm font-medium">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  isActive
                    ? 'text-emerald-700'
                    : 'text-slate-500 hover:text-slate-900'
                }
              >
                {item.label}
              </NavLink>
            ))}
            {user && (
              <span className="ml-2 flex items-center gap-3 border-l border-slate-200 pl-4">
                <span className="text-slate-400">
                  {profile?.full_name || user.email}
                </span>
                <button
                  onClick={() => signOut()}
                  className="text-slate-500 hover:text-slate-900"
                >
                  Sign out
                </button>
              </span>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
