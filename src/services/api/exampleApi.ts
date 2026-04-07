import { get } from './client'

export interface OkResponse {
  status: 'ok'
}

export async function getOkExample(): Promise<OkResponse> {
  const mockUrl = new URL('/mock-api/ok.json', window.location.origin).toString()
  return get<OkResponse>(mockUrl, { skipAuth: true, skipRetry: true })
}
