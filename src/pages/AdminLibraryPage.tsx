import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { LayoutGrid, Table, Trash2 } from 'lucide-react'
import { deleteDocument, getComplianceStatus, getDocuments, getFreshnessThresholds } from '../services/documentStore'
import type { DocumentListRecord, FreshnessThresholds } from '../types/documents'

type ViewMode = 'table' | 'card'

export default function AdminLibraryPage() {
  const [query, setQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [refreshTick, setRefreshTick] = useState(0)
  const [documents, setDocuments] = useState<DocumentListRecord[]>([])
  const [thresholds, setThresholds] = useState<FreshnessThresholds>({ currentWithinDays: 365, reviewSoonWithinDays: 730 })

  useEffect(() => {
    let mounted = true
    async function loadData() {
      const [docs, fresh] = await Promise.all([getDocuments(), getFreshnessThresholds()])
      if (!mounted) return
      setDocuments(docs)
      setThresholds(fresh)
    }
    void loadData()
    return () => {
      mounted = false
    }
  }, [refreshTick])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return documents
    return documents.filter(item => `${item.name} ${item.issuer} ${item.code}`.toLowerCase().includes(q))
  }, [documents, query])

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this document?')) return
    await deleteDocument(id)
    setRefreshTick(prev => prev + 1)
  }

  return (
    <div className="space-y-4">
      <section className="card-shell space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-[var(--brand-navy)]">Admin - Document Library</h2>
          <div className="flex items-center gap-2">
            <Link to="/admin/upload" className="btn-primary">Upload New Document</Link>
            <div className="inline-flex rounded-[3px] border p-1" style={{ borderColor: 'var(--border-muted)', background: 'var(--card-bg)' }}>
              <button type="button" onClick={() => setViewMode('table')} className={`view-toggle ${viewMode === 'table' ? 'view-toggle-active' : ''}`}><Table className="h-4 w-4" /></button>
              <button type="button" onClick={() => setViewMode('card')} className={`view-toggle ${viewMode === 'card' ? 'view-toggle-active' : ''}`}><LayoutGrid className="h-4 w-4" /></button>
            </div>
          </div>
        </div>

        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search records" className="input-shell" />
      </section>

      {viewMode === 'table' ? (
        <section className="card-shell overflow-x-auto p-0 table-scroll-hint">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left">
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Issuer</th>
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">Revision</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Compliance</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id} className="border-b border-slate-100">
                  <td className="px-3 py-2 font-semibold">{item.name}</td>
                  <td className="px-3 py-2">{item.issuer}</td>
                  <td className="px-3 py-2 font-mono">{item.code}</td>
                  <td className="px-3 py-2">{item.revision_date}</td>
                  <td className="px-3 py-2"><span className="status-pill">{item.status_badge}</span></td>
                  <td className="px-3 py-2"><span className="compliance-pill">{getComplianceStatus(item, thresholds)}</span></td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Link to={`/admin/edit/${item.id}`} className="btn-lite">Edit</Link>
                      <button type="button" className="btn-lite text-red-700" onClick={() => { void handleDelete(item.id) }}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map(item => (
            <article key={item.id} className="card-shell">
              <h3 className="font-semibold">{item.name}</h3>
              <p className="text-sm text-slate-600">{item.issuer}</p>
              <p className="mt-1 text-xs font-mono text-slate-500">{item.code}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="status-pill">{item.status_badge}</span>
                <span className="compliance-pill">{getComplianceStatus(item, thresholds)}</span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Link to={`/admin/edit/${item.id}`} className="btn-lite">Edit</Link>
                <button type="button" className="btn-lite text-red-700" onClick={() => { void handleDelete(item.id) }}>Delete</button>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  )
}
