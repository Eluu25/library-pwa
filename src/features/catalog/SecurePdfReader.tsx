import { useEffect, useRef, useState, useCallback } from 'react'
import {
  X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2,
  Minimize2, Shield, AlertTriangle, RotateCcw, Moon, Sun, BookOpen
} from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`
}

type ReadingTheme = 'light' | 'sepia' | 'night'

interface SecurePdfReaderProps {
  pdfUrl: string
  bookTitle: string
  userName: string
  userEmail: string
  onClose: () => void
}

export default function SecurePdfReader({
  pdfUrl,
  bookTitle,
  userName,
  userEmail,
  onClose,
}: SecurePdfReaderProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [scale, setScale] = useState(1.0)
  const [baseFitScale, setBaseFitScale] = useState(1.0)
  const [loading, setLoading] = useState(true)
  const [pageRendering, setPageRendering] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [pageInput, setPageInput] = useState('1')

  // Reading theme: light, sepia (warm parchment), or night (dark mode)
  const [theme, setTheme] = useState<ReadingTheme>(() => {
    return (localStorage.getItem('pdf_reader_theme') as ReadingTheme) || 'light'
  })

  const cycleTheme = () => {
    setTheme(current => {
      const next: ReadingTheme =
        current === 'light' ? 'sepia' : current === 'sepia' ? 'night' : 'light'
      localStorage.setItem('pdf_reader_theme', next)
      return next
    })
  }

  // Block print & save keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Block Ctrl+P, Ctrl+S, Ctrl+U
      if ((e.ctrlKey || e.metaKey) && ['p', 's', 'u'].includes(e.key.toLowerCase())) {
        e.preventDefault()
        e.stopPropagation()
      }
      // Arrow navigation
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        goToNextPage()
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        goToPrevPage()
      } else if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [totalPages, currentPage, isFullscreen])

  // Load PDF Document & calculate initial fit scale for mobile / iPhone / desktop
  useEffect(() => {
    let isCancelled = false
    setLoading(true)
    setError(null)

    const loadingTask = pdfjsLib.getDocument({
      url: pdfUrl,
      withCredentials: false,
    })

    loadingTask.promise
      .then(async doc => {
        if (isCancelled) return
        setPdfDoc(doc)
        setTotalPages(doc.numPages)
        setCurrentPage(1)
        setPageInput('1')

        // Calculate auto-fit scale based on current device screen width
        try {
          const firstPage = await doc.getPage(1)
          const baseViewport = firstPage.getViewport({ scale: 1.0 })
          const screenWidth = window.innerWidth
          const margin = screenWidth < 640 ? 24 : 48
          const targetWidth = Math.min(screenWidth - margin, 900)
          const computedScale = Math.max(0.4, Math.min(targetWidth / baseViewport.width, 2.5))
          setScale(computedScale)
          setBaseFitScale(computedScale)
        } catch {
          setScale(1.0)
        }

        setLoading(false)
      })
      .catch(err => {
        if (isCancelled) return
        console.error('PDF load error:', err)
        setError('Failed to load the book. Please ensure you have access and check your connection.')
        setLoading(false)
      })

    return () => {
      isCancelled = true
      loadingTask.destroy()
    }
  }, [pdfUrl])

  // Draw security watermark onto the canvas
  const drawWatermark = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, dpr: number) => {
    ctx.save()
    ctx.globalAlpha = 0.12
    const fontSize = Math.max(14 * dpr, 16)
    ctx.font = `bold ${fontSize}px sans-serif`
    ctx.fillStyle = '#0f172a'

    const watermarkText = `CONFIDENTIAL • ${userName} (${userEmail}) • COMMUNITY LIBRARY`

    ctx.translate(width / 2, height / 2)
    ctx.rotate((-35 * Math.PI) / 180)

    const stepY = 140 * dpr
    const stepX = 420 * dpr
    for (let y = -height; y < height; y += stepY) {
      for (let x = -width; x < width; x += stepX) {
        ctx.fillText(watermarkText, x, y)
      }
    }

    ctx.restore()
  }, [userName, userEmail])

  // Render current page with Retina / High-DPI support (iPhones & 4K displays)
  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdfDoc || !canvasRef.current) return
    setPageRendering(true)

    try {
      const page = await pdfDoc.getPage(pageNum)
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1
      const viewport = page.getViewport({ scale })

      canvas.width = Math.floor(viewport.width * dpr)
      canvas.height = Math.floor(viewport.height * dpr)

      canvas.style.width = `${Math.floor(viewport.width)}px`
      canvas.style.height = `${Math.floor(viewport.height)}px`

      const transform = dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined

      const renderContext = {
        canvasContext: ctx,
        viewport,
        canvas,
        transform,
      }

      await page.render(renderContext).promise

      drawWatermark(ctx, canvas.width, canvas.height, dpr)
    } catch (err: unknown) {
      console.error('Page render error:', err)
    } finally {
      setPageRendering(false)
    }
  }, [pdfDoc, scale, drawWatermark])

  useEffect(() => {
    if (pdfDoc) {
      renderPage(currentPage)
    }
  }, [pdfDoc, currentPage, scale, renderPage])

  const goToPrevPage = () => {
    if (currentPage > 1) {
      const next = currentPage - 1
      setCurrentPage(next)
      setPageInput(String(next))
    }
  }

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      const next = currentPage + 1
      setCurrentPage(next)
      setPageInput(String(next))
    }
  }

  // Touch gestures for iPhone / Mobile swipe left & right
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return
    const diffX = touchStartX.current - e.changedTouches[0].clientX
    const diffY = touchStartY.current - e.changedTouches[0].clientY

    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 45) {
      if (diffX > 0) {
        goToNextPage()
      } else {
        goToPrevPage()
      }
    }
    touchStartX.current = null
    touchStartY.current = null
  }

  const handlePageSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const p = parseInt(pageInput, 10)
    if (!isNaN(p) && p >= 1 && p <= totalPages) {
      setCurrentPage(p)
    } else {
      setPageInput(String(currentPage))
    }
  }

  const resetFit = () => {
    setScale(baseFitScale)
  }

  const toggleFullscreen = () => {
    if (!containerRef.current) return
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(() => {})
      }
      setIsFullscreen(true)
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {})
      }
      setIsFullscreen(false)
    }
  }

  // Canvas visual filter for Night / Sepia modes
  const getCanvasStyle = (): React.CSSProperties => {
    if (theme === 'night') {
      return {
        filter: 'invert(0.92) hue-rotate(180deg) contrast(1.1) brightness(0.92)',
        backgroundColor: '#121212',
      }
    }
    if (theme === 'sepia') {
      return {
        filter: 'sepia(0.55) contrast(0.96) brightness(0.96)',
        backgroundColor: '#fbf0d9',
      }
    }
    return {
      filter: 'none',
      backgroundColor: '#ffffff',
    }
  }

  const getMainBackground = () => {
    if (theme === 'night') return 'bg-black'
    if (theme === 'sepia') return 'bg-[#292218]/90'
    return 'bg-slate-900/60'
  }

  return (
    <div
      ref={containerRef}
      onContextMenu={e => e.preventDefault()}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={`fixed inset-0 z-[100] bg-slate-950 flex flex-col select-none text-white overflow-hidden ${
        isFullscreen ? 'p-0' : ''
      }`}
      style={{
        userSelect: 'none',
        WebkitUserSelect: 'none',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* Top Navigation Bar with iPhone notch safe-area */}
      <header className="h-14 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-3 sm:px-4 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-2 min-w-0 pr-2">
          <Shield className="h-4 w-4 shrink-0 text-emerald-400" />
          <span className="font-semibold text-xs sm:text-sm text-slate-200 truncate max-w-[120px] xs:max-w-[180px] sm:max-w-md">
            {bookTitle}
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Theme Selector (Night Mode / Sepia / Day) */}
          <button
            onClick={cycleTheme}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-medium transition ${
              theme === 'night'
                ? 'bg-indigo-950/80 border-indigo-700 text-indigo-300'
                : theme === 'sepia'
                ? 'bg-amber-950/80 border-amber-700 text-amber-300'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }`}
            title={`Reading Mode: ${theme.toUpperCase()} (Click to toggle)`}
          >
            {theme === 'night' ? (
              <Moon className="h-3.5 w-3.5 text-indigo-400" />
            ) : theme === 'sepia' ? (
              <BookOpen className="h-3.5 w-3.5 text-amber-400" />
            ) : (
              <Sun className="h-3.5 w-3.5 text-amber-300" />
            )}
            <span className="capitalize hidden xs:inline">{theme}</span>
          </button>

          {/* Zoom controls */}
          <div className="flex items-center gap-0.5 bg-slate-800 rounded-lg p-0.5 border border-slate-700">
            <button
              onClick={() => setScale(s => Math.max(0.4, Number((s - 0.15).toFixed(2))))}
              className="p-1 sm:p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition"
              title="Zoom Out"
            >
              <ZoomOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
            <button
              onClick={resetFit}
              className="px-1.5 py-0.5 text-[11px] font-mono text-slate-300 hover:text-white hover:bg-slate-700 rounded transition flex items-center gap-0.5"
              title="Fit to screen width"
            >
              <RotateCcw className="h-3 w-3 hidden xs:inline" />
              <span>{Math.round((scale / baseFitScale) * 100)}%</span>
            </button>
            <button
              onClick={() => setScale(s => Math.min(2.5, Number((s + 0.15).toFixed(2))))}
              className="p-1 sm:p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition"
              title="Zoom In"
            >
              <ZoomIn className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
          </div>

          {/* Fullscreen toggle */}
          <button
            onClick={toggleFullscreen}
            className="hidden sm:inline-flex p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>

          {/* Close button */}
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 hover:bg-red-500/20 hover:text-red-400 rounded-lg text-slate-400 transition ml-0.5"
            title="Close Reader"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Reader Main Area with Dynamic Theme Background */}
      <main className={`flex-1 overflow-auto flex items-start sm:items-center justify-center p-2 sm:p-4 relative transition-colors duration-200 touch-pan-y ${getMainBackground()}`}>
        {loading && (
          <div className="flex flex-col items-center gap-3 my-auto py-12">
            <div className="animate-spin h-8 w-8 rounded-full border-3 border-brand-500 border-t-transparent" />
            <p className="text-sm text-slate-400">Loading book securely...</p>
          </div>
        )}

        {error && (
          <div className="max-w-md bg-red-950/50 border border-red-800 text-red-200 rounded-2xl p-5 text-center space-y-3 my-auto">
            <AlertTriangle className="h-8 w-8 text-red-400 mx-auto" />
            <p className="text-sm">{error}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-red-800 hover:bg-red-700 text-white rounded-lg text-xs font-semibold"
            >
              Back to Catalog
            </button>
          </div>
        )}

        {/* Security Watermark Floating Overlay */}
        {!loading && !error && (
          <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-4 sm:p-6 opacity-30 select-none overflow-hidden">
            <div className="text-[9px] sm:text-[10px] text-slate-400 font-mono tracking-wider truncate">
              {userName} • {userEmail}
            </div>
            <div className="text-[9px] sm:text-[10px] text-slate-400 font-mono tracking-wider self-end">
              Community Library • Non-Transferable Digital Edition
            </div>
          </div>
        )}

        {/* Page Canvas with Theme Shader */}
        <div className={`relative shadow-2xl transition-opacity duration-150 mx-auto ${loading || error ? 'hidden' : 'block'}`}>
          <canvas
            ref={canvasRef}
            className="rounded-lg shadow-black/80 shadow-2xl max-w-full select-none block transition-all duration-200"
            style={{
              pointerEvents: 'none',
              ...getCanvasStyle(),
            }}
          />
          {pageRendering && (
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center rounded-lg backdrop-blur-[1px]">
              <div className="animate-spin h-6 w-6 rounded-full border-2 border-brand-400 border-t-transparent" />
            </div>
          )}
        </div>
      </main>

      {/* Bottom Paging Controls with iPhone Home Bar padding */}
      <footer className="h-14 bg-slate-900/95 backdrop-blur border-t border-slate-800 px-3 sm:px-4 flex items-center justify-between shrink-0 z-20">
        <button
          onClick={goToPrevPage}
          disabled={currentPage <= 1 || pageRendering}
          className="flex items-center gap-1 sm:gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 disabled:opacity-30 text-xs font-medium transition"
        >
          <ChevronLeft className="h-4 w-4" /> <span className="hidden xs:inline">Prev</span>
        </button>

        {/* Page input / indicator & swipe hint on mobile */}
        <div className="flex flex-col items-center">
          <form onSubmit={handlePageSubmit} className="flex items-center gap-1.5 text-xs text-slate-300">
            <span>Page</span>
            <input
              type="number"
              min={1}
              max={totalPages || 1}
              value={pageInput}
              onChange={e => setPageInput(e.target.value)}
              onBlur={() => setPageInput(String(currentPage))}
              className="w-10 sm:w-12 bg-slate-800 border border-slate-700 rounded px-1 py-0.5 text-center font-mono text-white text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <span>of {totalPages || 1}</span>
          </form>
          <span className="text-[10px] text-slate-500 hidden sm:block">Swipe left/right to turn page</span>
        </div>

        <button
          onClick={goToNextPage}
          disabled={currentPage >= totalPages || pageRendering}
          className="flex items-center gap-1 sm:gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 disabled:opacity-30 text-xs font-medium transition"
        >
          <span className="hidden xs:inline">Next</span> <ChevronRight className="h-4 w-4" />
        </button>
      </footer>
    </div>
  )
}
