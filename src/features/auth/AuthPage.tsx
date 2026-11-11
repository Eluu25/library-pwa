import { useState, FormEvent } from 'react'
import { supabase } from '../../lib/supabase'

type Tab = 'signin' | 'signup'

export default function AuthPage() {
  const [tab, setTab] = useState<Tab>('signin')

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="flex border-b border-slate-200">
          <button
            className={`flex-1 py-4 text-sm font-semibold transition-colors ${
              tab === 'signin'
                ? 'text-brand-700 border-b-2 border-brand-500'
                : 'text-slate-500 hover:text-slate-700'
            }`}
            onClick={() => setTab('signin')}
          >
            Sign In
          </button>
          <button
            className={`flex-1 py-4 text-sm font-semibold transition-colors ${
              tab === 'signup'
                ? 'text-brand-700 border-b-2 border-brand-500'
                : 'text-slate-500 hover:text-slate-700'
            }`}
            onClick={() => setTab('signup')}
          >
            Sign Up
          </button>
        </div>

        <div className="p-6">
          {tab === 'signin' ? <SignInForm /> : <SignUpForm />}
        </div>
      </div>
    </div>
  )
}

function SignInForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          placeholder="••••••••"
        />
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-brand-500 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold py-2 rounded-lg transition-colors"
      >
        {loading ? 'Signing in…' : 'Sign In'}
      </button>
    </form>
  )
}

interface SignUpFields {
  full_name: string
  email: string
  phone: string
  address: string
  emergency_name: string
  emergency_phone: string
  password: string
  confirmPassword: string
}

function SignUpForm() {
  const [fields, setFields] = useState<SignUpFields>({
    full_name: '',
    email: '',
    phone: '',
    address: '',
    emergency_name: '',
    emergency_phone: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  function update(key: keyof SignUpFields) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setFields(prev => ({ ...prev, [key]: e.target.value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (fields.password !== fields.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email: fields.email,
      password: fields.password,
      options: {
        data: {
          full_name: fields.full_name,
          phone: fields.phone,
          address: fields.address,
          emergency_name: fields.emergency_name,
          emergency_phone: fields.emergency_phone,
        },
      },
    })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
    }
  }

  if (success) {
    return (
      <div className="text-center py-8 space-y-2">
        <div className="text-4xl">📧</div>
        <p className="text-brand-700 font-semibold">Check your email to confirm your account.</p>
      </div>
    )
  }

  const fieldDefs: { key: keyof SignUpFields; label: string; type?: string; placeholder?: string }[] = [
    { key: 'full_name', label: 'Full Name', placeholder: 'Abebe Kebede' },
    { key: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com' },
    { key: 'phone', label: 'Phone', type: 'tel', placeholder: '+251 9...' },
    { key: 'address', label: 'Address', placeholder: 'Addis Ababa, Bole...' },
    { key: 'emergency_name', label: 'Emergency Contact Name', placeholder: 'Contact name' },
    { key: 'emergency_phone', label: 'Emergency Contact Phone', type: 'tel', placeholder: '+251 9...' },
    { key: 'password', label: 'Password', type: 'password', placeholder: '••••••••' },
    { key: 'confirmPassword', label: 'Confirm Password', type: 'password', placeholder: '••••••••' },
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {fieldDefs.map(({ key, label, type = 'text', placeholder }) => (
        <div key={key}>
          <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
          <input
            type={type}
            required
            value={fields[key]}
            onChange={update(key)}
            placeholder={placeholder}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      ))}
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-brand-500 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold py-2 rounded-lg transition-colors"
      >
        {loading ? 'Creating account…' : 'Sign Up'}
      </button>
    </form>
  )
}
