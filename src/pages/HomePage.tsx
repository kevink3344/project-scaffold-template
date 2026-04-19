import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { LayoutGrid, Mic, MicOff, Table } from 'lucide-react'
import { useCategories } from '../hooks/useCategories'
import { getDocuments, getRecentlyViewed } from '../services/documentStore'
import type { DocumentListRecord } from '../types/documents'

type ViewMode = 'card' | 'table'

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition
    webkitSpeechRecognition?: new () => SpeechRecognition
  }
}

interface SpeechRecognition extends EventTarget {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onend: (() => void) | null
  start: () => void
}

interface SpeechRecognitionEvent extends Event {
  results: {
    [index: number]: {
      [index: number]: { transcript: string }
    }
    length: number
  }
}

export default function HomePage() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [viewMode, setViewMode] = useState<ViewMode>('card')
  const [listening, setListening] = useState(false)

  const categories = useCategories()
  const allDocuments = useMemo(() => getDocuments(), [])

  const filtered = useMemo(() => {
    return allDocuments.filter(item => {
      const categoryOk = category === 'all' || item.categories.includes(category)
      const q = query.trim().toLowerCase()
      const text = `${item.name} ${item.issuer} ${item.code} ${item.notes} ${item.categories.join(' ')}`.toLowerCase()
      const queryOk = q.length === 0 || text.includes(q)
      return categoryOk && queryOk
    })
  }, [allDocuments, category, query])

  const recentlyViewed = useMemo(() => {
    const lookup = new Map(allDocuments.map(item => [item.id, item]))
    return getRecentlyViewed()
      .map(item => lookup.get(item.id))
      .filter((item): item is DocumentListRecord => Boolean(item))
      .slice(0, 8)
  }, [allDocuments])

  function handleVoiceSearch() {
    const SpeechRecognitionCtor = (window.SpeechRecognition || window.webkitSpeechRecognition) as (new () => SpeechRecognition) | undefined

    if (!SpeechRecognitionCtor) {
      window.alert('Voice search is not supported in this browser.')
      return
    }

    const recognition = new SpeechRecognitionCtor()
    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognition.continuous = false
    recognition.onresult = (event) => {
      const transcript = event.results[0][0]?.transcript || ''
      setQuery(transcript)
    }
    recognition.onend = () => {
      setListening(false)
    }

    setListening(true)
    recognition.start()
  }

  return (
    <div className="space-y-5">
      <section className="card-shell space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[var(--brand-navy)]">Search Documents</h2>
          <div className="rounded-[3px] border px-3 py-1 text-sm font-medium" style={{ borderColor: 'var(--border-muted)', background: 'var(--surface-subtle)', color: 'var(--text-primary)' }}>
            Results: {filtered.length}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by document name, code, issuer, or notes"
              className="input-shell h-12 text-lg"
            />
            <button type="button" onClick={handleVoiceSearch} className="btn-lite h-12 w-12" aria-label="Voice search">
              {listening ? <MicOff className="h-5 w-5 text-red-600" /> : <Mic className="h-5 w-5" />}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select value={category} onChange={(event) => setCategory(event.target.value)} className="input-shell h-12 flex-1 min-w-36">
              <option value="all">All Categories</option>
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <div className="inline-flex rounded-[3px] border p-1" style={{ borderColor: 'var(--border-muted)', background: 'var(--card-bg)' }}>
              <button type="button" className={`view-toggle ${viewMode === 'card' ? 'view-toggle-active' : ''}`} onClick={() => setViewMode('card')}>
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button type="button" className={`view-toggle ${viewMode === 'table' ? 'view-toggle-active' : ''}`} onClick={() => setViewMode('table')}>
                <Table className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {query.trim().length === 0 && recentlyViewed.length > 0 && (
        <section className="card-shell">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">Recently Viewed</h3>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {recentlyViewed.map(item => (
              <Link key={item.id} to={`/documents/${item.id}`} className="rounded-[3px] border p-3 transition" style={{ borderColor: 'var(--border-muted)', background: 'var(--card-bg)' }} onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent-bg)')} onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-muted)') }>
                <p className="font-semibold">{item.name}</p>
                <p className="text-xs text-slate-500">{item.issuer}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {viewMode === 'card' ? (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map(item => (
            <article key={item.id} className="card-shell bg-[var(--card-bg)]">
              <div className="mb-3 flex items-start justify-between gap-2">
                <h3 className="font-semibold">{item.name}</h3>
                <span className="status-pill">{item.status_badge}</span>
              </div>
              <p className="text-sm text-slate-600">{item.issuer}</p>
              <p className="mt-1 text-xs font-mono text-slate-500">{item.code}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {item.categories.map(cat => <span key={cat} className="chip">{cat}</span>)}
              </div>
              <div className="mt-4">
                <Link to={`/documents/${item.id}`} className="btn-primary inline-flex">Open</Link>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className="card-shell overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left">
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Issuer</th>
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id} className="border-b border-slate-100">
                  <td className="px-3 py-2 font-semibold">{item.name}</td>
                  <td className="px-3 py-2">{item.issuer}</td>
                  <td className="px-3 py-2 font-mono">{item.code}</td>
                  <td className="px-3 py-2">{item.categories.join(', ')}</td>
                  <td className="px-3 py-2"><span className="status-pill">{item.status_badge}</span></td>
                  <td className="px-3 py-2"><Link to={`/documents/${item.id}`} className="btn-lite">View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  )
}
