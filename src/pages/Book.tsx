const COURTS = Array.from({ length: 12 }, (_, i) => i + 1)

export default function Book() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Book a Court</h1>
      <p className="mt-1 text-sm text-slate-500">
        Court availability and booking will go here (Step 4).
      </p>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {COURTS.map((n) => (
          <div
            key={n}
            className="rounded-lg border border-slate-200 bg-white p-4 text-center shadow-sm"
          >
            <div className="text-sm text-slate-500">Court</div>
            <div className="text-xl font-semibold text-slate-900">{n}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
