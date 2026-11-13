import { useState, useEffect } from 'react'
import { Download, Share, X, PlusSquare, Monitor, Smartphone, CheckCircle2 } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [showGuideModal, setShowGuideModal] = useState(false)
  const [isIos, setIsIos] = useState(false)

  useEffect(() => {
    // Check if already in standalone app mode (already installed)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    if (isStandalone) {
      setIsInstalled(true)
      return
    }

    // Detect iOS
    const ua = window.navigator.userAgent.toLowerCase()
    const ios = /iphone|ipad|ipod/.test(ua)
    setIsIos(ios)

    // Capture install prompt on Chromium (Desktop Chrome, Edge, Android)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
    }
  }, [])

  if (isInstalled) return null

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt()
        const choice = await deferredPrompt.userChoice
        if (choice.outcome === 'accepted') {
          setIsInstalled(true)
        }
        setDeferredPrompt(null)
      } catch {
        setShowGuideModal(true)
      }
    } else {
      setShowGuideModal(true)
    }
  }

  return (
    <>
      {/* Prominent Install Button in Header */}
      <button
        onClick={handleInstallClick}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold transition shadow-sm active:scale-95 cursor-pointer"
        title="Install Community Library as an app"
      >
        <Download className="h-3.5 w-3.5 text-white" />
        <span>Install App</span>
      </button>

      {/* Visual Install Instructions Modal */}
      {showGuideModal && (
        <div className="fixed inset-0 z-[120] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl text-slate-800">
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-brand-50 rounded-xl text-brand-700">
                  {isIos ? <Smartphone className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    Install Community Library
                  </h3>
                  <p className="text-xs text-slate-500">Run as a fast, standalone desktop or mobile app</p>
                </div>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* iOS Instructions */}
            {isIos ? (
              <div className="space-y-3 text-sm text-slate-600">
                <div className="flex items-start gap-3 bg-slate-50 p-2.5 rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    Tap the <strong className="text-slate-800">Share button</strong>{' '}
                    <Share className="inline h-4 w-4 text-blue-500 mx-0.5" /> at the bottom of Safari.
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-slate-50 p-2.5 rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    Scroll down and tap <strong className="text-slate-800">Add to Home Screen</strong>{' '}
                    <PlusSquare className="inline h-4 w-4 text-slate-700 mx-0.5" />.
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-slate-50 p-2.5 rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    Tap <strong className="text-slate-800">Add</strong> in the top-right corner. The app icon will appear on your iPhone screen!
                  </div>
                </div>
              </div>
            ) : (
              /* Desktop (Chrome / Edge / Brave) Instructions */
              <div className="space-y-3 text-sm text-slate-600">
                <div className="bg-brand-50/70 border border-brand-100 rounded-xl p-3 text-xs text-brand-800 flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-brand-600 shrink-0 mt-0.5" />
                  <span>
                    Installing turns this into a standalone desktop application with its own window, taskbar icon, and offline support.
                  </span>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-start gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      A
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-xs">Look at your Browser Address Bar</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        In the far-right corner of the address bar (where <code className="text-slate-700 font-mono">http://localhost:5174/library-pwa/</code> is written), look for the <strong>Install icon (🖥️ or ➕)</strong> and click it.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      B
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-xs">Or via Browser Menu (Three Dots ⋮)</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Click the <strong>three dots (⋮)</strong> in the top-right corner of Chrome or Edge ➔ select <strong>"Save and share"</strong> (or <strong>"Apps"</strong>) ➔ click <strong>"Install Community Library"</strong>.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowGuideModal(false)}
              className="w-full bg-brand-700 hover:bg-brand-600 text-white rounded-xl py-2.5 text-xs font-semibold transition"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  )
}
