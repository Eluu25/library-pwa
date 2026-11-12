import { useEffect, useState, FormEvent } from 'react'
import { CheckCircle2, IdCard, ShieldCheck, Upload } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from './AuthContext'
import { useToast } from '../../components/ToastProvider'

export default function ProfileSetupPage() {
  const { session, refreshProfile } = useAuth()
  const { notify } = useToast()
  const [faydaFile, setFaydaFile] = useState<File | null>(null)
  const [stagedFaydaPath, setStagedFaydaPath] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const userId = session?.user.id ?? ''

  useEffect(() => {
    const syncFaydaPath = () => {
      const path = sessionStorage.getItem('pendingFaydaPath') ?? ''
      if (path && !path.startsWith(`${userId}/`)) {
        sessionStorage.removeItem('pendingFaydaPath')
        setStagedFaydaPath('')
        return
      }
      setStagedFaydaPath(path)
    }
    syncFaydaPath()
    window.addEventListener('fayda-uploaded', syncFaydaPath)
    return () => window.removeEventListener('fayda-uploaded', syncFaydaPath)
  }, [userId])

  async function uploadFayda(file: File): Promise<string> {
    const extension = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1]
    const path = `${userId}/${Date.now()}_fayda.${extension}`
    const { error } = await supabase.storage.from('fayda-ids').upload(path, file)
    if (error) throw new Error(`Fayda ID upload failed: ${error.message}`)
    return path
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!faydaFile && !stagedFaydaPath) { setError('Please select your Fayda National ID photo.'); return }
    if (faydaFile && (!['image/jpeg', 'image/png', 'image/webp'].includes(faydaFile.type) || faydaFile.size > 2 * 1024 * 1024)) {
      setError('Fayda ID must be a JPG, PNG, or WebP image no larger than 2 MB.')
      return
    }

    setLoading(true)
    try {
      const faydaPath = stagedFaydaPath || await uploadFayda(faydaFile!)
      sessionStorage.setItem('pendingFaydaPath', faydaPath)
      const { error: rpcError } = await supabase.rpc('submit_member_verification', {
        p_fayda: faydaPath,
      })

      if (rpcError) throw new Error(rpcError.message)
      sessionStorage.removeItem('pendingFaydaPath')
      await refreshProfile()
      setSubmitted(true)
      notify('success', 'Fayda ID submitted', 'Your application is ready for admin review.')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.'
      setError(
        message.toLowerCase().includes('submit_member_verification') ||
        message.toLowerCase().includes('row-level security')
          ? `Fayda verification setup is missing in Supabase. Run supabase/migrations/20261112131800_member_identity_without_fee.sql in the Supabase SQL Editor, then try again. Details: ${message}`
          : message
      )
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center gap-4 p-6 text-center">
        <CheckCircle2 className="h-14 w-14 text-emerald-400" />
        <h1 className="text-2xl font-bold text-brand-700">Application Submitted!</h1>
        <p className="text-slate-600">Your Fayda ID is attached to your application. An admin can now review it.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-brand-600" />
            <h1 className="text-xl font-bold text-brand-700">Verify Your Identity</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">Upload your Fayda ID so an admin can verify your account.</p>
        </div>

        <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Fayda ID Upload */}
              {stagedFaydaPath ? (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <IdCard className="h-5 w-5 shrink-0 text-emerald-700" />
                  <div className="text-sm">
                    <p className="font-semibold text-emerald-800">Fayda ID uploaded</p>
                    <p className="text-emerald-700">Your ID photo is ready to submit for review.</p>
                  </div>
                </div>
              ) : <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Fayda National ID Photo <span className="text-red-600">*</span>
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={e => setFaydaFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brand-500 file:text-white hover:file:bg-brand-700 cursor-pointer"
                />
                {faydaFile && <p className="text-xs text-slate-500 mt-1">Selected: {faydaFile.name}</p>}
                <p className="text-xs text-slate-500 mt-1">JPG, PNG, or WebP; maximum 2 MB.</p>
              </div>}

              {error && <p className="text-red-600 text-sm">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                <Upload className="h-4 w-4" />
                {loading ? 'Uploading ID…' : 'Submit ID for review'}
              </button>
            </form>
        </div>
      </div>
    </div>
  )
}
