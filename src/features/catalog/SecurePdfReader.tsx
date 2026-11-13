import { useEffect, useRef, useState, useCallback } from 'react'
import {
  X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2,
  Minimize2, Shield, AlertTriangle
} from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`
}

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

  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [scale, setScale] = useState(1.2)
  const [loading, setLoading] = useState(true)
  const [pageRendering, setPageRendering] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [pageInput, setPageInput] = useState('1')

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

  // Load PDF Document
  useEffect(() => {
    let isCancelled = false
    setLoading(true)
    setError(null)

    const loadingTask = pdfjsLib.getDocument({
      url: pdfUrl,
      withCredentials: false,
    })

    loadingTask.promise
      .then(doc => {
        if (isCancelled) return
        setPdfDoc(doc)
        setTotalPages(doc.numPages)
        setCurrentPage(1)
        setPageInput('1')
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
  const drawWatermark = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.save()
    ctx.globalAlpha = 0.12
    ctx.font = 'bold 16px sans-serif'
    ctx.fillStyle = '#0f172a'

    const watermarkText = `CONFIDENTIAL • ${userName} (${userEmail}) • COMMUNITY LIBRARY`

    // Rotate and tile watermark diagonally across page
    ctx.translate(width / 2, height / 2)
    ctx.rotate((-35 * Math.PI) / 180)

    const stepY = 120
    const stepX = 400
    for (let y = -height; y < height; y += stepY) {
      for (let x = -width; x < width; x += stepX) {
        ctx.fillText(watermarkText, x, y)
      }
    }

    ctx.restore()
  }, [userName, userEmail])

  // Render current page
  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdfDoc || !canvasRef.current) return
    setPageRendering(true)

    try {
      const page = await pdfDoc.getPage(pageNum)
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const viewport = page.getViewport({ scale })
      canvas.height = viewport.height
      canvas.width = viewport.width

      const renderContext = {
        canvasContext: ctx,
        viewport,
        canvas,
      }

      await page.render(renderContext).promise

      // Burn watermark directly into the canvas pixels
      drawWatermark(ctx, viewport.width, viewport.height)
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

  const handlePageSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const p = parseInt(pageInput, 10)
    if (!isNaN(p) && p >= 1 && p <= totalPages) {
      setCurrentPage(p)
    } else {
      setPageInput(String(currentPage))
    }
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

  return (
    <div
      ref={containerRef}
      onContextMenu={e => e.preventDefault()}
      className={`fixed inset-0 z-[100] bg-slate-950 flex flex-col select-none text-white overflow-hidden ${
        isFullscreen ? 'p-0' : ''
      }`}
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      {/* Top Navigation Bar */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-1.5 text-brand-400 font-semibold text-sm truncate max-w-xs sm:max-w-md">
            <Shield className="h-4 w-4 shrink-0 text-emerald-400" />
            <span className="truncate">{bookTitle}</span>
          </div>
          <span className="hidden md:inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
            Protected Reader
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-800 rounded-lg p-0.5 border border-slate-700">
            <button
              onClick={() => setScale(s => Math.max(0.7, s - 0.2))}
              className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition"
              title="Zoom Out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="text-xs px-1 text-slate-300 font-mono">
              {Math.round((scale / 1.2) * 100)}%
            </span>
            <button
              onClick={() => setScale(s => Math.min(2.5, s + 0.2))}
              className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition"
              title="Zoom In"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>

          {/* Fullscreen toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>

          {/* Close button */}
          <button
            onClick={onClose}
            className="p-2 hover:bg-red-500/20 hover:text-red-400 rounded-lg text-slate-400 transition"
            title="Close Reader"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Reader Area */}
      <main className="flex-1 overflow-auto flex items-center justify-center p-4 relative bg-slate-900/60">
        {loading && (
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin h-8 w-8 rounded-full border-3 border-brand-500 border-t-transparent" />
            <p className="text-sm text-slate-400">Loading book securely...</p>
          </div>
        )}

        {error && (
          <div className="max-w-md bg-red-950/50 border border-red-800 text-red-200 rounded-2xl p-5 text-center space-y-3">
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
          <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-6 opacity-30 select-none overflow-hidden">
            <div className="text-[10px] text-slate-400 font-mono tracking-wider">
              {userName} • {userEmail}
            </div>
            <div className="text-[10px] text-slate-400 font-mono tracking-wider self-end">
              Community Library • Non-Transferable Digital Edition
            </div>
          </div>
        )}

        {/* Page Canvas */}
        <div className={`relative shadow-2xl transition-opacity duration-150 ${loading || error ? 'hidden' : 'block'}`}>
          <canvas
            ref={canvasRef}
            className="rounded-lg shadow-black/60 shadow-2xl max-w-full bg-white select-none"
            style={{ pointerEvents: 'none' }}
          />
          {pageRendering && (
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center rounded-lg backdrop-blur-[1px]">
              <div className="animate-spin h-6 w-6 rounded-full border-2 border-brand-400 border-t-transparent" />
            </div>
          )}
        </div>
      </main>

      {/* Bottom Paging Controls */}
      <footer className="h-14 bg-slate-900 border-t border-slate-800 px-4 flex items-center justify-between shrink-0 z-20">
        <button
          onClick={goToPrevPage}
          disabled={currentPage <= 1 || pageRendering}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 text-xs font-medium transition"
        >
          <ChevronLeft className="h-4 w-4" /> Previous
        </button>

        {/* Page input / indicator */}
        <form onSubmit={handlePageSubmit} className="flex items-center gap-1.5 text-xs text-slate-300">
          <span>Page</span>
          <input
            type="number"
            min={1}
            max={totalPages || 1}
            value={pageInput}
            onChange={e => setPageInput(e.target.value)}
            onBlur={() => setPageInput(String(currentPage))}
            className="w-12 bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-center font-mono text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <span>of {totalPages || 1}</span>
        </form>

        <button
          onClick={goToNextPage}
          disabled={currentPage >= totalPages || pageRendering}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 text-xs font-medium transition"
        >
          Next <ChevronRight className="h-4 w-4" />
        </button>
      </footer>
    </div>
  )
}
