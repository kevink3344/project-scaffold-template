import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Download, ExternalLink, Volume2, ClipboardCheck, FileText, History, ArrowLeft } from 'lucide-react'
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { getComplianceStatus, getDocumentById, getFreshnessThresholds, trackRecentlyViewed, getActivityLog, addActivityEntry } from '../services/documentStore'
import type { ActivityLogEntry, DocumentListRecord, FreshnessThresholds } from '../types/documents'

GlobalWorkerOptions.workerSrc = pdfWorker

export default function DocumentDetailPage() {
  const { id = '' } = useParams()
  const [pageCount, setPageCount] = useState<number | null>(null)
  const [doc, setDoc] = useState<DocumentListRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [thresholds, setThresholds] = useState<FreshnessThresholds>({ currentWithinDays: 365, reviewSoonWithinDays: 730 })
  const [activity, setActivity] = useState<ActivityLogEntry[]>([])
  const [markingReviewed, setMarkingReviewed] = useState(false)
  const [activeTab, setActiveTab] = useState<'details' | 'activity'>('details')

  useEffect(() => {
    let mounted = true

    async function loadDoc() {
      setIsLoading(true)
      setDoc(null)
      setPageCount(null)

      try {
        const [documentRecord, fresh, log] = await Promise.all([
          getDocumentById(id),
          getFreshnessThresholds(),
          getActivityLog(id),
        ])
        if (!mounted) return
        setDoc(documentRecord)
        setThresholds(fresh)
        setActivity(log)

        if (!documentRecord) return
        await trackRecentlyViewed(documentRecord.id).catch(() => null)

        getDocument(documentRecord.pdf_url).promise
          .then((pdf) => {
            if (mounted) setPageCount(pdf.numPages)
          })
          .catch(() => {
            if (mounted) setPageCount(null)
          })
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    void loadDoc()
    return () => {
      mounted = false
    }
  }, [id])

  async function handleMarkReviewed() {
    if (!doc) return
    setMarkingReviewed(true)
    try {
      await addActivityEntry(doc.id, 'reviewed', 'Document reviewed — no changes required.')
      const updated = await getActivityLog(doc.id)
      setActivity(updated)
    } finally {
      setMarkingReviewed(false)
    }
  }

  if (isLoading) {
    return (
      <div className="card-shell flex items-center justify-center gap-3 py-8 text-slate-600">
        <span className="h-5 w-5 rounded-full border-2 border-slate-300 border-t-[var(--brand-navy)] animate-spin" aria-hidden="true" />
        <p>Loading document...</p>
      </div>
    )
  }

  if (!doc) {
    return (
      <div className="card-shell">
        <p>Document not found.</p>
        <Link to="/" className="btn-primary mt-3 inline-flex">Back to Search</Link>
      </div>
    )
  }

  const compliance = getComplianceStatus(doc, thresholds)

  function handleReadAloud() {
    if (!doc) return
    const utterance = new SpeechSynthesisUtterance(
      `${doc.name}. Issued by ${doc.issuer}. Code ${doc.code}. Revision date ${doc.revision_date}. Status ${doc.status_badge}. Categories ${doc.categories.join(', ')}.`,
    )
    utterance.rate = 1
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
  }

  return (
    <div className="space-y-4">
      <section className="card-shell">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 order-2 sm:order-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-semibold text-[var(--brand-navy)]">{doc.name}</h2>
              <span className="status-pill">{doc.status_badge}</span>
              <span className="compliance-pill">{compliance}</span>
            </div>
            <p className="text-sm text-slate-600">{doc.issuer}</p>
            <p className="mt-1 font-mono text-xs text-slate-500">{doc.code}</p>
          </div>
          <div className="flex items-center gap-4 text-sm font-semibold order-1 sm:order-2">
            <button
              type="button"
              className="border-b-2 pb-1 transition-colors flex items-center gap-1"
              style={{ borderColor: activeTab === 'details' ? 'var(--accent-bg)' : 'transparent', color: activeTab === 'details' ? 'var(--brand-navy)' : 'var(--text-secondary)' }}
              onClick={() => setActiveTab('details')}
            >
              <FileText className="h-4 w-4" />
              Details
            </button>
            <button
              type="button"
              className="border-b-2 pb-1 transition-colors flex items-center gap-1"
              style={{ borderColor: activeTab === 'activity' ? 'var(--accent-bg)' : 'transparent', color: activeTab === 'activity' ? 'var(--brand-navy)' : 'var(--text-secondary)' }}
              onClick={() => setActiveTab('activity')}
            >
              <History className="h-4 w-4" />
              Activity History
            </button>
          </div>
        </div>

        {activeTab === 'details' ? (
          <>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <Meta label="Document Code" value={doc.code} mono />
              <Meta label="Revision Date" value={doc.revision_date} />
              <Meta label="Category" value={doc.categories.join(', ')} />
              <Meta label="Locations/Departments" value={doc.locations.join(', ')} />
              <Meta label="Format/Type" value={`${doc.format_type} / ${doc.doc_type}`} />
              <Meta label="Departments" value={doc.departments.join(', ')} />
            </div>

            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Notes</p>
              <div className="rounded-[3px] border border-slate-300 bg-white p-3">
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{doc.notes?.trim() ? doc.notes : 'No notes'}</p>
              </div>
            </div>

            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Hazard / Tags</p>
              <div className="flex flex-wrap gap-1">
                {doc.hazard_tags.length ? doc.hazard_tags.map(tag => <span key={tag} className="chip">{tag}</span>) : <span className="text-sm text-slate-500">No hazard tags</span>}
              </div>
            </div>
          </>
        ) : (
          <div className="mt-4">
            {activity.length === 0 ? (
              <p className="text-sm text-slate-500">No activity recorded for this document.</p>
            ) : (
              <ol className="relative border-l border-slate-200 pl-5 space-y-4">
                {activity.map((entry) => (
                  <li key={entry.id} className="relative">
                    <span className={`absolute -left-[1.1rem] mt-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-white ${actionColor(entry.action)}`} />
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className={`inline-block rounded-[3px] px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${actionBadge(entry.action)}`}>
                        {entry.action}
                      </span>
                      <span className="text-sm font-medium text-slate-800">{entry.actor_name}</span>
                      {entry.actor_email && (
                        <span className="text-xs text-slate-500">&lt;{entry.actor_email}&gt;</span>
                      )}
                      <span className="ml-auto text-xs text-slate-400">{formatDate(entry.created_at)}</span>
                    </div>
                    {entry.note && <p className="mt-1 text-sm text-slate-600">{entry.note}</p>}
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
      </section>

      <section className="card-shell">
        <div className="mb-3 flex flex-wrap gap-2">
          <button type="button" className="btn-primary inline-flex items-center gap-2" onClick={handleReadAloud}>
            <Volume2 className="h-4 w-4" />
            <span className="hidden sm:inline">Read Aloud</span>
          </button>
          <button
            type="button"
            className="btn-lite inline-flex items-center gap-2"
            onClick={handleMarkReviewed}
            disabled={markingReviewed}
          >
            <ClipboardCheck className="h-4 w-4" />
            <span className="hidden sm:inline">{markingReviewed ? 'Logging…' : 'Mark Reviewed'}</span>
          </button>
          <a href={doc.pdf_url} target="_blank" rel="noreferrer" className="btn-lite inline-flex items-center gap-2">
            <ExternalLink className="h-4 w-4" />
            <span className="hidden sm:inline">Open PDF</span>
          </a>
          <a href={doc.pdf_url} download className="btn-lite inline-flex items-center gap-2">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Download</span>
          </a>
          <Link to="/" className="btn-lite inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Search</span>
          </Link>
        </div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Embedded PDF Viewer</h3>
          <span className="text-xs text-slate-500">{pageCount ? `${pageCount} pages` : 'Page count unavailable'}</span>
        </div>
        <div className="hidden overflow-hidden rounded-[3px] border border-slate-300 lg:block">
          <iframe src={doc.pdf_url} title={doc.name} className="h-[720px] w-full" />
        </div>
        <div className="lg:hidden">
          <p className="text-sm text-slate-600">PDF embed is optimized for desktop. Use Open PDF on mobile.</p>
        </div>
      </section>
    </div>
  )
}

interface MetaProps {
  label: string
  value: string
  mono?: boolean
}

function Meta({ label, value, mono = false }: MetaProps) {
  return (
    <div className="rounded-[3px] border border-slate-300 bg-white p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-sm ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  )
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
  } catch {
    return iso
  }
}

function actionColor(action: string) {
  switch (action) {
    case 'created': return 'bg-blue-500'
    case 'edited': return 'bg-amber-400'
    case 'reviewed': return 'bg-green-500'
    case 'archived': return 'bg-slate-400'
    case 'restored': return 'bg-purple-500'
    default: return 'bg-slate-300'
  }
}

function actionBadge(action: string) {
  switch (action) {
    case 'created': return 'bg-blue-100 text-blue-800'
    case 'edited': return 'bg-amber-100 text-amber-800'
    case 'reviewed': return 'bg-green-100 text-green-800'
    case 'archived': return 'bg-slate-100 text-slate-600'
    case 'restored': return 'bg-purple-100 text-purple-800'
    default: return 'bg-slate-100 text-slate-600'
  }
}
