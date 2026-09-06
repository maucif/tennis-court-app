import { NavLink, Outlet } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Book a Court' },
  { to: '/my-reservations', label: 'My Reservations' },
  { to: '/admin', label: 'Admin' },
]

export default function Layout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <span className="text-lg font-semibold text-emerald-700">
            🎾 Court Reserve
          </span>
          <nav className="flex gap-4 text-sm font-medium">
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
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
