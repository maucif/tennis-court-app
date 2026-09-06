import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Signup() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    setSubmitting(false)
    if (error) {
      setError(error.message)
      return
    }
    // If email confirmation is off, a session comes back immediately.
    if (data.session) {
      navigate('/', { replace: true })
    } else {
      setDone(true)
    }
  }

  if (done) {
    return (
      <div className="mx-auto mt-12 max-w-sm text-center">
        <h1 className="text-2xl font-semibold text-slate-900">
          Check your email
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          We sent a confirmation link to {email}. Confirm it, then log in.
        </p>
        <Link
          to="/login"
          className="mt-4 inline-block text-sm text-emerald-700 hover:underline"
        >
          Go to login
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto mt-12 max-w-sm">
      <h1 className="text-2xl font-semibold text-slate-900">Sign up</h1>
      <p className="mt-1 text-sm text-slate-500">Create your member account.</p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Full name
          </label>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Password
          </label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
        >
          {submitting ? 'Signing up…' : 'Sign up'}
        </button>
      </form>
      <p className="mt-4 text-sm text-slate-500">
        Already have an account?{' '}
        <Link to="/login" className="text-emerald-700 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  )
}
