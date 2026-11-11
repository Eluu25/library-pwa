import { useState, FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from './AuthContext'

type Step = 1 | 2

export default function ProfileSetupPage() {
  const { session } = useAuth()
  const [step, setStep] = useState<Step>(1)
  const [faydaFile, setFaydaFile] = useState<File | null>(null)
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [txnId, setTxnId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const userId = session?.user.id ?? ''

  async function uploadFile(bucket: string, file: File): Promise<string> {
    const path = `${userId}/${Date.now()}_${file.name}`
    const { error } = await supabase.storage.from(bucket).upload(path, file)
    if (error) throw new Error(`Upload failed (${bucket}): ${error.message}`)
    return path
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!faydaFile) { setError('Please select your Fayda National ID photo.'); return }
    if (!proofFile) { setError('Please select your payment proof screenshot.'); return }
    if (!txnId.trim()) { setError('Please enter the transaction ID.'); return }

    setLoading(true)
    try {
      const [faydaPath, proofPath] = await Promise.all([
        uploadFile('fayda-ids', faydaFile),
        uploadFile('payment-proofs', proofFile),
      ])

      const { error: rpcError } = await supabase.rpc('submit_membership', {
        p_fayda: faydaPath,
        p_txn: txnId.trim(),
        p_proof: proofPath,
      })

      if (rpcError) throw new Error(rpcError.message)
      setSubmitted(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="text-5xl">✅</div>
        <h1 className="text-2xl font-bold text-brand-700">Application Submitted!</h1>
        <p className="text-slate-600">Please wait for admin review. We'll notify you once approved.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-200">
          <h1 className="text-xl font-bold text-brand-700">Complete Your Profile</h1>
          <p className="text-sm text-slate-500 mt-1">A few steps to activate your library membership.</p>
        </div>

        {/* Steps indicator */}
        <div className="flex border-b border-slate-200">
          {/* Step 1 */}
          <div
            className={`flex-1 flex items-center gap-2 px-4 py-3 text-sm font-medium ${
              step >= 1 ? 'text-brand-700' : 'text-slate-400'
            }`}
          >
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-500 text-white text-xs font-bold">
              ✓
            </span>
            Account Created
          </div>
          {/* Step 2 */}
          <div
            className={`flex-1 flex items-center gap-2 px-4 py-3 text-sm font-medium ${
              step === 2 ? 'text-brand-700' : 'text-slate-400'
            }`}
          >
            <span
              className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                step === 2 ? 'bg-brand-500 text-white' : 'bg-slate-200 text-slate-500'
              }`}
            >
              2
            </span>
            Verification
          </div>
        </div>

        <div className="p-6">
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl">
                <span className="text-2xl">✓</span>
                <div>
                  <p className="font-semibold text-green-800">Account created</p>
                  <p className="text-sm text-green-600">Your account has been created successfully.</p>
                </div>
              </div>
              <button
                onClick={() => setStep(2)}
                className="w-full bg-brand-500 hover:bg-brand-700 text-white font-semibold py-2 rounded-lg transition-colors"
              >
                Continue →
              </button>
            </div>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Fayda ID Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Fayda National ID Photo
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => setFaydaFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brand-500 file:text-white hover:file:bg-brand-700 cursor-pointer"
                />
                {faydaFile && <p className="text-xs text-slate-500 mt-1">Selected: {faydaFile.name}</p>}
              </div>

              {/* Membership fee notice */}
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                <p className="font-semibold mb-1">💳 Membership Fee Payment</p>
                <p>Pay <strong>100 ETB</strong> membership fee via mobile money (Telebirr / CBE Birr), then upload your payment screenshot below.</p>
              </div>

              {/* Transaction ID */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Transaction ID</label>
                <input
                  type="text"
                  required
                  value={txnId}
                  onChange={e => setTxnId(e.target.value)}
                  placeholder="e.g. TXN1234567890"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* Payment Proof Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Payment Screenshot
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => setProofFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brand-500 file:text-white hover:file:bg-brand-700 cursor-pointer"
                />
                {proofFile && <p className="text-xs text-slate-500 mt-1">Selected: {proofFile.name}</p>}
              </div>

              {error && <p className="text-red-600 text-sm">{error}</p>}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 border border-slate-300 text-slate-700 font-semibold py-2 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-brand-500 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold py-2 rounded-lg transition-colors"
                >
                  {loading ? 'Submitting…' : 'Submit Application'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
