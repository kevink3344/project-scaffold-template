import { get } from './client'

export interface OkResponse {
  status: 'ok'
}

export interface HealthResponse {
  status: 'ok'
  service: string
  timestamp: string
}

export interface UserRecord {
  id: number
  name: string
  email: string
  role: string
  date_created: string
  date_modified: string
  team_subscriptions: number[]
}

export interface UsersResponse {
  users: UserRecord[]
}

export interface TeamRecord {
  id: number
  name: string
  description: string
}

export interface TeamsResponse {
  teams: TeamRecord[]
}

export interface NotificationRecord {
  id: number
  title: string
  message: string
  type: 'info' | 'warning' | 'success'
  is_read: boolean
  date_created: string
}

export interface NotificationsResponse {
  notifications: NotificationRecord[]
}

export async function getOkExample(): Promise<OkResponse> {
  const mockUrl = new URL('/mock-api/ok.json', window.location.origin).toString()
  return get<OkResponse>(mockUrl, { skipAuth: true, skipRetry: true })
}

export async function getHealthExample(): Promise<HealthResponse> {
  const mockUrl = new URL('/mock-api/health.json', window.location.origin).toString()
  return get<HealthResponse>(mockUrl, { skipAuth: true, skipRetry: true })
}

export async function getUsersExample(): Promise<UsersResponse> {
  const mockUrl = new URL('/mock-api/users.json', window.location.origin).toString()
  return get<UsersResponse>(mockUrl, { skipAuth: true, skipRetry: true })
}

export async function getTeamsExample(): Promise<TeamsResponse> {
  const mockUrl = new URL('/mock-api/teams.json', window.location.origin).toString()
  return get<TeamsResponse>(mockUrl, { skipAuth: true, skipRetry: true })
}

export async function getNotificationsExample(): Promise<NotificationsResponse> {
  const mockUrl = new URL('/mock-api/notifications.json', window.location.origin).toString()
  return get<NotificationsResponse>(mockUrl, { skipAuth: true, skipRetry: true })
}
