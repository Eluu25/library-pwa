import { useState, FormEvent, ChangeEvent } from 'react'
import { supabase } from '../../lib/supabase'
import AuthShell, { AuthTab } from '../../components/AuthShell'
import { Button, Input, Banner } from '../../components/ui'
import { Mail, Lock, User, Phone, MapPin, HeartHandshake, CheckCircle2 } from 'lucide-react'

export default function AuthPage() {
  const [tab, setTab] = useState<AuthTab>('signin')

  return (
    <AuthShell activeTab={tab} onTabChange={setTab}>
      {tab === 'signin' ? <SignInForm /> : <SignUpForm />}
    </AuthShell>
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
      {error && (
        <Banner
          variant="red"
          title="Sign in failed"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      <Input
        label="Email address"
        type="email"
        required
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="you@example.com"
        icon={<Mail className="w-4 h-4" />}
        autoComplete="email"
      />

      <Input
        label="Password"
        type="password"
        required
        value={password}
        onChange={e => setPassword(e.target.value)}
        placeholder="••••••••"
        icon={<Lock className="w-4 h-4" />}
        autoComplete="current-password"
      />

      <div className="pt-2">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={loading}
          loadingText="Signing in..."
          className="w-full"
        >
          Sign In to Library
        </Button>
      </div>

      <p className="text-center text-xs text-slate-500 pt-2">
        Protected with encrypted credentials and Row-Level Security.
      </p>
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
    return (e: ChangeEvent<HTMLInputElement>) =>
      setFields(prev => ({ ...prev, [key]: e.target.value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (fields.password !== fields.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (fields.password.length < 6) {
      setError('Password must be at least 6 characters.')
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
      <div className="text-center py-6 space-y-4">
        <div className="w-14 h-14 bg-emerald-100 text-brand-600 rounded-2xl mx-auto flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">Account Created!</h3>
          <p className="text-sm text-slate-600 mt-1 max-w-sm mx-auto">
            Welcome to the Community Library. You can now sign in to upload your Fayda ID and complete registration.
          </p>
        </div>
        <div className="pt-2">
          <Button
            type="button"
            variant="primary"
            onClick={() => window.location.reload()}
            className="w-full"
          >
            Continue to Sign In
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5">
      {error && (
        <Banner
          variant="red"
          title="Sign up issue"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      <Input
        label="Full Name"
        required
        value={fields.full_name}
        onChange={update('full_name')}
        placeholder="e.g. Abebe Kebede"
        icon={<User className="w-4 h-4" />}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Email"
          type="email"
          required
          value={fields.email}
          onChange={update('email')}
          placeholder="you@example.com"
          icon={<Mail className="w-4 h-4" />}
        />

        <Input
          label="Phone"
          type="tel"
          required
          value={fields.phone}
          onChange={update('phone')}
          placeholder="+251 9..."
          icon={<Phone className="w-4 h-4" />}
        />
      </div>

      <Input
        label="Residential Address"
        required
        value={fields.address}
        onChange={update('address')}
        placeholder="Sub-city, Woreda, House No."
        icon={<MapPin className="w-4 h-4" />}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Emergency Contact Name"
          required
          value={fields.emergency_name}
          onChange={update('emergency_name')}
          placeholder="Family / Guardian name"
          icon={<HeartHandshake className="w-4 h-4" />}
        />

        <Input
          label="Emergency Phone"
          type="tel"
          required
          value={fields.emergency_phone}
          onChange={update('emergency_phone')}
          placeholder="+251 9..."
          icon={<Phone className="w-4 h-4" />}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Password"
          type="password"
          required
          value={fields.password}
          onChange={update('password')}
          placeholder="••••••••"
          icon={<Lock className="w-4 h-4" />}
        />

        <Input
          label="Confirm Password"
          type="password"
          required
          value={fields.confirmPassword}
          onChange={update('confirmPassword')}
          placeholder="••••••••"
          icon={<Lock className="w-4 h-4" />}
        />
      </div>

      <div className="pt-2">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={loading}
          loadingText="Creating account..."
          className="w-full"
        >
          Create Member Account
        </Button>
      </div>

      <p className="text-center text-xs text-slate-500">
        By signing up, you agree to return borrowed books before their due date.
      </p>
    </form>
  )
}
