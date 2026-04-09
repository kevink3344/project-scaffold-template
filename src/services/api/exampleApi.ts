import { get } from './client'

export interface OkResponse {
  status: 'ok'
}

export interface HealthResponse {
  status: 'ok'
  service: string
  timestamp: string
}

export interface UsersResponse {
  users: Array<{
    id: number
    name: string
    role: string
  }>
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
