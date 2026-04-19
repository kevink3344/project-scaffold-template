import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Download, ExternalLink, Volume2 } from 'lucide-react'
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { getComplianceStatus, getDocumentById, getFreshnessThresholds, trackRecentlyViewed } from '../services/documentStore'
import type { DocumentListRecord, FreshnessThresholds } from '../types/documents'

GlobalWorkerOptions.workerSrc = pdfWorker

export default function DocumentDetailPage() {
  const { id = '' } = useParams()
  const [pageCount, setPageCount] = useState<number | null>(null)
  const [doc, setDoc] = useState<DocumentListRecord | null>(null)
  const [thresholds, setThresholds] = useState<FreshnessThresholds>({ currentWithinDays: 365, reviewSoonWithinDays: 730 })

  useEffect(() => {
    let mounted = true

    async function loadDoc() {
      const [documentRecord, fresh] = await Promise.all([getDocumentById(id), getFreshnessThresholds()])
      if (!mounted) return
      setDoc(documentRecord)
      setThresholds(fresh)

      if (!documentRecord) return
      await trackRecentlyViewed(documentRecord.id).catch(() => null)

      getDocument(documentRecord.pdf_url).promise
        .then((pdf) => {
          if (mounted) setPageCount(pdf.numPages)
        })
        .catch(() => {
          if (mounted) setPageCount(null)
        })
    }

    void loadDoc()
    return () => {
      mounted = false
    }
  }, [id])

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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-[var(--brand-navy)]">{doc.name}</h2>
            <p className="text-sm text-slate-600">{doc.issuer}</p>
            <p className="mt-1 font-mono text-xs text-slate-500">{doc.code}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="status-pill">{doc.status_badge}</span>
            <span className="compliance-pill">{compliance}</span>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <Meta label="Document Code" value={doc.code} mono />
          <Meta label="Revision Date" value={doc.revision_date} />
          <Meta label="Category" value={doc.categories.join(', ')} />
          <Meta label="Locations/Departments" value={doc.locations.join(', ')} />
          <Meta label="Format/Type" value={`${doc.format_type} / ${doc.doc_type}`} />
          <Meta label="Audience" value={doc.audience.join(', ')} />
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

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="btn-primary inline-flex items-center gap-2" onClick={handleReadAloud}>
            <Volume2 className="h-4 w-4" /> Read Aloud
          </button>
          <a href={doc.pdf_url} target="_blank" rel="noreferrer" className="btn-lite inline-flex items-center gap-2">
            <ExternalLink className="h-4 w-4" /> Open PDF
          </a>
          <a href={doc.pdf_url} download className="btn-lite inline-flex items-center gap-2">
            <Download className="h-4 w-4" /> Download
          </a>
          <Link to="/" className="btn-lite">Back to Search</Link>
        </div>
      </section>

      <section className="card-shell">
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
