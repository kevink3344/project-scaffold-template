import { getNotificationsExample, type NotificationRecord } from './exampleApi'

const NOTIFICATIONS_CACHE_KEY = 'notifications-cache-v1'

function readCache(): NotificationRecord[] {
  const rawValue = localStorage.getItem(NOTIFICATIONS_CACHE_KEY)

  if (!rawValue) {
    return []
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown
    return Array.isArray(parsed) ? parsed as NotificationRecord[] : []
  } catch {
    return []
  }
}

function writeCache(notifications: NotificationRecord[]): void {
  localStorage.setItem(NOTIFICATIONS_CACHE_KEY, JSON.stringify(notifications))
}

export function getCachedNotifications(): NotificationRecord[] {
  return readCache()
}

export async function loadNotificationsFeed(forceRefresh = false): Promise<NotificationRecord[]> {
  const cachedNotifications = readCache()

  if (!forceRefresh && cachedNotifications.length > 0) {
    return cachedNotifications
  }

  const response = await getNotificationsExample()
  writeCache(response.notifications)
  return response.notifications
}

export function markNotificationAsRead(notificationId: number): NotificationRecord[] {
  const updatedNotifications = readCache().map(notification => (
    notification.id === notificationId
      ? { ...notification, is_read: true }
      : notification
  ))

  writeCache(updatedNotifications)
  return updatedNotifications
}

export function markAllNotificationsAsRead(): NotificationRecord[] {
  const updatedNotifications = readCache().map(notification => ({
    ...notification,
    is_read: true,
  }))

  writeCache(updatedNotifications)
  return updatedNotifications
}
