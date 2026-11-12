import { useState, FormEvent, ChangeEvent } from 'react'
import { supabase } from '../../lib/supabase'
import AuthShell, { AuthTab } from '../../components/AuthShell'
import { Button, Input, Banner } from '../../components/ui'
import {
  Mail, Lock, User, Phone, MapPin, HeartHandshake, CheckCircle2,
  IdCard, ShieldCheck
} from 'lucide-react'

export default function AuthPage() {
  const [tab, setTab] = useState<AuthTab>('signin')

  return (
    <AuthShell activeTab={tab} onTabChange={setTab}>
      {tab === 'signin' ? <SignInForm /> : <SignUpForm onContinue={() => setTab('signin')} />}
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
    if (error) {
      setError(error.message === 'Email not confirmed'
        ? 'Email confirmation is enabled in Supabase. Disable it in Authentication settings; email is only collected for your account form.'
        : error.message)
    }
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

function isValidPhone(value: string) {
  const trimmed = value.trim()
  if (!trimmed || !/^[+0-9\s()-]+$/.test(trimmed)) return false
  const digits = trimmed.replace(/\D/g, '')
  const normalized = trimmed.replace(/[\s()-]/g, '')
  if (normalized.startsWith('+')) return /^\+[1-9]\d{7,14}$/.test(normalized)
  if (normalized.includes('+')) return false
  return /^\d{9,15}$/.test(digits)
}

function SignUpForm({ onContinue }: { onContinue: () => void }) {
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
  const [signupNotice, setSignupNotice] = useState<string | null>(null)
  const [faydaSubmitted, setFaydaSubmitted] = useState(false)
  const [faydaFile, setFaydaFile] = useState<File | null>(null)
  const [phoneTouched, setPhoneTouched] = useState({ phone: false, emergency_phone: false })

  function update(key: keyof SignUpFields) {
    return (e: ChangeEvent<HTMLInputElement>) =>
      setFields(prev => ({ ...prev, [key]: e.target.value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!fields.full_name.trim() || !fields.address.trim() ||
        !fields.emergency_name.trim()) {
      setError('Enter your name, residential address, and emergency contact name.')
      return
    }

    if (fields.password !== fields.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (fields.password.length < 8 || !/[a-z]/.test(fields.password) ||
        !/[A-Z]/.test(fields.password) || !/\d/.test(fields.password)) {
      setError('Use at least 8 characters, including an uppercase letter, a lowercase letter, and a number.')
      return
    }

    if (!isValidPhone(fields.phone) || !isValidPhone(fields.emergency_phone)) {
      setPhoneTouched({ phone: true, emergency_phone: true })
      setError('Enter a complete phone number (9–15 local digits or an international +country code).')
      return
    }

    if (!faydaFile) {
      setError('Please select a photo of your Fayda National ID.')
      return
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(faydaFile.type) || faydaFile.size > 2 * 1024 * 1024) {
      setError('Fayda ID must be a JPG, PNG, or WebP image no larger than 2 MB.')
      return
    }

    setLoading(true)
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: fields.email.trim().toLowerCase(),
        password: fields.password,
        options: {
          data: {
            full_name: fields.full_name.trim(),
            phone: fields.phone.trim(),
            address: fields.address.trim(),
            emergency_name: fields.emergency_name.trim(),
            emergency_phone: fields.emergency_phone.trim(),
          },
        },
      })

      if (signUpError) {
        setError(signUpError.message)
        return
      }

      if (data.session && data.user) {
        try {
          const extension = faydaFile.type === 'image/jpeg' ? 'jpg' : faydaFile.type.split('/')[1]
          const path = `${data.user.id}/${Date.now()}_fayda.${extension}`
          const { error: uploadError } = await supabase.storage
            .from('fayda-ids')
            .upload(path, faydaFile)
          if (uploadError) throw uploadError
          sessionStorage.setItem('pendingFaydaPath', path)
          window.dispatchEvent(new Event('fayda-uploaded'))
          const { error: submitError } = await supabase.rpc('submit_member_verification', {
            p_fayda: path,
          })
          if (submitError) {
            throw submitError
          }
          setFaydaSubmitted(true)
        } catch (uploadError: unknown) {
          setSignupNotice(
            `Your account was created, but the ID could not be linked to your application. Sign in and submit it on the verification page. ${
              uploadError instanceof Error ? uploadError.message : ''
            }`
          )
        }
      } else {
        setSignupNotice('Your account was created, but Supabase did not start a session. Disable email confirmation in Supabase Authentication settings, then sign in and submit your Fayda ID.')
      }

      setSuccess(true)
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : 'Account creation failed unexpectedly.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="text-center py-6 space-y-4">
        <div className="w-14 h-14 bg-emerald-100 text-brand-600 rounded-2xl mx-auto flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">
            Account created
          </h3>
          <p className="text-sm text-slate-600 mt-1 max-w-sm mx-auto">
            {faydaSubmitted
              ? 'Your Fayda ID has been attached to your application for admin review.'
              : 'Your email is used for your account details, not for approval. There is no membership fee; payment is only required when borrowing a book.'}
          </p>
        </div>
        {signupNotice && (
          <p role="status" className="text-sm text-amber-200 bg-amber-950/40 border border-amber-800 rounded-xl p-3">
            {signupNotice}
          </p>
        )}
        <div className="pt-2">
          <Button
            type="button"
            variant="primary"
            onClick={onContinue}
            className="w-full"
          >
            Back to Sign In
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
        minLength={2}
        maxLength={100}
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
          maxLength={254}
          value={fields.email}
          onChange={update('email')}
          placeholder="you@example.com"
          icon={<Mail className="w-4 h-4" />}
        />

        <Input
          label="Phone"
          type="tel"
          required
          maxLength={24}
          autoComplete="tel"
          error={phoneTouched.phone && fields.phone && !isValidPhone(fields.phone)
            ? 'Enter a complete phone number (9–15 local digits or an international +country code).'
            : undefined}
          value={fields.phone}
          onChange={e => setFields(prev => ({ ...prev, phone: e.target.value }))}
          onBlur={() => setPhoneTouched(prev => ({ ...prev, phone: true }))}
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
          maxLength={24}
          autoComplete="tel"
          error={phoneTouched.emergency_phone && fields.emergency_phone && !isValidPhone(fields.emergency_phone)
            ? 'Enter a complete phone number (9–15 local digits or an international +country code).'
            : undefined}
          value={fields.emergency_phone}
          onChange={e => setFields(prev => ({ ...prev, emergency_phone: e.target.value }))}
          onBlur={() => setPhoneTouched(prev => ({ ...prev, emergency_phone: true }))}
          placeholder="+251 9..."
          icon={<Phone className="w-4 h-4" />}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Password"
          type="password"
          required
          minLength={8}
          value={fields.password}
          onChange={update('password')}
          placeholder="••••••••"
          icon={<Lock className="w-4 h-4" />}
        />

        <Input
          label="Confirm Password"
          type="password"
          required
          minLength={8}
          value={fields.confirmPassword}
          onChange={update('confirmPassword')}
          placeholder="••••••••"
          icon={<Lock className="w-4 h-4" />}
        />
      </div>

      <div className="rounded-2xl border border-brand-100 bg-brand-50/70 p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-white p-2 text-brand-700 shadow-sm">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Identity verification is required</p>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
              Upload a clear Fayda National ID photo. Admin approval is required before borrowing. You only pay when you borrow a book.
            </p>
          </div>
        </div>
        <label htmlFor="fayda-id" className="block text-xs font-semibold uppercase tracking-wide text-slate-700">
          Fayda National ID photo *
        </label>
        <input
          id="fayda-id"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
          onChange={e => setFaydaFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:text-sm file:font-semibold file:text-brand-700 hover:file:bg-brand-100"
        />
        <p className="flex items-center gap-1.5 text-xs text-slate-500">
          <IdCard className="h-3.5 w-3.5" />
          JPG, PNG, or WebP; maximum 2 MB.
          {faydaFile && <span className="truncate font-medium text-slate-700">{faydaFile.name}</span>}
        </p>
        <p className="text-xs leading-relaxed text-slate-500">
          Your email is used for account details and sign-in. Admin approval is based on your Fayda ID, not email confirmation.
        </p>
      </div>

      <p className="text-xs text-slate-500">
        Password must contain at least 8 characters, including uppercase, lowercase, and a number.
      </p>

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
        Phone numbers must be valid. Your Fayda ID is reviewed by an admin; email confirmation is not part of approval.
      </p>
    </form>
  )
}
