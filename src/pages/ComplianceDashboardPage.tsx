import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { DEFAULT_CATEGORIES, getComplianceStatus, getDocuments, getFreshnessThresholds } from '../services/documentStore'

export default function ComplianceDashboardPage() {
  const docs = useMemo(() => getDocuments(), [])
  const thresholds = useMemo(() => getFreshnessThresholds(), [])

  const stats = useMemo(() => {
    const totals = { total: docs.length, current: 0, reviewSoon: 0, outOfDate: 0 }

    for (const doc of docs) {
      const status = getComplianceStatus(doc, thresholds)
      if (status === 'current') totals.current += 1
      if (status === 'review-soon') totals.reviewSoon += 1
      if (status === 'out-of-date') totals.outOfDate += 1
    }

    return totals
  }, [docs, thresholds])

  const attention = useMemo(() => {
    return docs
      .map(doc => {
        const ageDays = Math.floor((Date.now() - new Date(doc.revision_date).getTime()) / (1000 * 60 * 60 * 24))
        return { doc, status: getComplianceStatus(doc, thresholds), ageDays }
      })
      .filter(item => item.status !== 'current')
      .sort((a, b) => b.ageDays - a.ageDays)
  }, [docs, thresholds])

  const categoryCoverage = useMemo(() => {
    return DEFAULT_CATEGORIES.map(cat => {
      const count = docs.filter(doc => doc.categories.includes(cat)).length
      return { category: cat, count }
    })
  }, [docs])

  const maxCoverage = Math.max(1, ...categoryCoverage.map(item => item.count))

  return (
    <div className="space-y-4">
      <section className="card-shell flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-[var(--brand-navy)]">Compliance Dashboard</h2>
          <p className="text-sm text-slate-600">Track freshness and category coverage for governance readiness.</p>
        </div>
        <Link to="/admin/library" className="btn-lite">Back to Library</Link>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total" value={stats.total} tone="text-slate-900" />
        <StatCard title="Current" value={stats.current} tone="text-emerald-700" />
        <StatCard title="Review Soon" value={stats.reviewSoon} tone="text-amber-700" />
        <StatCard title="Out of Date" value={stats.outOfDate} tone="text-red-700" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <article className="card-shell overflow-x-auto p-0">
          <div className="border-b border-slate-200 p-3">
            <h3 className="text-lg font-semibold">Documents Needing Attention</h3>
          </div>
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left">
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Issuer</th>
                <th className="px-3 py-2">Revision Date</th>
                <th className="px-3 py-2">Age (days)</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {attention.map(item => (
                <tr key={item.doc.id} className="border-b border-slate-100">
                  <td className="px-3 py-2 font-semibold">{item.doc.name}</td>
                  <td className="px-3 py-2">{item.doc.issuer}</td>
                  <td className="px-3 py-2">{item.doc.revision_date}</td>
                  <td className="px-3 py-2 font-mono">{item.ageDays}</td>
                  <td className="px-3 py-2"><span className="compliance-pill">{item.status}</span></td>
                </tr>
              ))}
              {attention.length === 0 && (
                <tr>
                  <td className="px-3 py-3 text-slate-600" colSpan={5}>All documents are current.</td>
                </tr>
              )}
            </tbody>
          </table>
        </article>

        <article className="card-shell">
          <h3 className="text-lg font-semibold">Coverage by Category</h3>
          <div className="mt-3 space-y-2">
            {categoryCoverage.map(item => {
              const width = `${(item.count / maxCoverage) * 100}%`
              const empty = item.count === 0
              return (
                <div key={item.category} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className={empty ? 'font-semibold text-red-700' : ''}>{item.category}</span>
                    <span className="font-mono">{item.count}</span>
                  </div>
                  <div className="h-3 rounded-[3px] border border-slate-300 bg-white">
                    <div className={`h-full rounded-[2px] ${empty ? 'bg-red-600' : 'bg-[var(--accent-bg)]'}`} style={{ width: empty ? '100%' : width }} />
                  </div>
                </div>
              )
            })}
          </div>
        </article>
      </section>
    </div>
  )
}

interface StatCardProps {
  title: string
  value: number
  tone: string
}

function StatCard({ title, value, tone }: StatCardProps) {
  return (
    <article className="card-shell">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <p className={`mt-2 text-3xl font-bold ${tone}`}>{value}</p>
    </article>
  )
}
