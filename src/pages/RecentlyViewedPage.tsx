import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getDocuments, getRecentlyViewed } from '../services/documentStore'

export default function RecentlyViewedPage() {
  const records = useMemo(() => {
    const documents = getDocuments()
    const byId = new Map(documents.map(item => [item.id, item]))

    return getRecentlyViewed()
      .map(entry => ({ entry, doc: byId.get(entry.id) }))
      .filter(item => Boolean(item.doc))
      .slice(0, 20)
  }, [])

  return (
    <div className="space-y-4">
      <section className="card-shell">
        <h2 className="text-xl font-semibold text-[var(--brand-navy)]">Recently Viewed Documents</h2>
        <p className="mt-1 text-sm text-slate-600">Up to 20 recent records, stored in localStorage.</p>
      </section>

      <section className="space-y-2">
        {records.length === 0 && (
          <div className="card-shell text-sm text-slate-600">No recently viewed documents yet.</div>
        )}

        {records.map(({ entry, doc }) => {
          if (!doc) return null
          return (
            <article key={`${doc.id}-${entry.viewed_at}`} className="card-shell flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{doc.name}</p>
                <p className="text-sm text-slate-600">{doc.issuer}</p>
                <p className="text-xs text-slate-500">Viewed {new Date(entry.viewed_at).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="status-pill">{doc.status_badge}</span>
                <Link className="btn-lite" to={`/documents/${doc.id}`}>Open</Link>
              </div>
            </article>
          )
        })}
      </section>
    </div>
  )
}
