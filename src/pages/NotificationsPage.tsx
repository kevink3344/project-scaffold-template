import { useEffect, useState } from 'react'
import { BellRing, Siren, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getReminderNotifications } from '../services/documentStore'
import type { ReminderNotification } from '../types/documents'

function NotificationIcon({ severity }: { severity: ReminderNotification['severity'] }) {
  if (severity === 'danger') return <Siren className="h-4 w-4 text-red-600" />
  return <TriangleAlert className="h-4 w-4 text-amber-600" />
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<ReminderNotification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    async function load() {
      setIsLoading(true)
      setError('')

      try {
        const data = await getReminderNotifications()
        if (!mounted) return
        setNotifications(data)
      } catch (err) {
        if (!mounted) return
        const message = err instanceof Error ? err.message : 'Unable to load notifications.'
        setError(message)
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    void load()
    return () => {
      mounted = false
    }
  }, [])

  return (
    <div className="space-y-4">
      <section className="card-shell flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-[var(--brand-navy)]">Notifications</h2>
          <p className="text-sm text-slate-600">Review documents nearing review or already out of date.</p>
        </div>
        <Link to="/" className="btn-lite">Back to Dashboard</Link>
      </section>

      {isLoading && <section className="card-shell text-sm text-slate-600">Loading notifications...</section>}
      {error && <section className="card-shell text-sm font-semibold text-red-700">{error}</section>}

      {!isLoading && !error && notifications.length === 0 && (
        <section className="card-shell flex items-center gap-3 text-sm text-slate-600">
          <BellRing className="h-5 w-5" />
          <span>No reminders right now. All documents are within freshness thresholds.</span>
        </section>
      )}

      {!isLoading && !error && notifications.length > 0 && (
        <section className="space-y-3">
          {notifications.map(notification => (
            <article key={notification.id} className="card-shell flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <div className="mt-0.5">
                  <NotificationIcon severity={notification.severity} />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold">{notification.title}</p>
                  <p className="text-sm text-slate-600">{notification.message}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                    <span className="chip">{notification.document_name}</span>
                    <span>Issuer: {notification.issuer}</span>
                    <span>Revision: {notification.revision_date}</span>
                    <span>Age: {notification.age_days} days</span>
                  </div>
                </div>
              </div>
              <Link to={`/documents/${notification.document_id}`} className="btn-lite">Open Document</Link>
            </article>
          ))}
        </section>
      )}
    </div>
  )
}
