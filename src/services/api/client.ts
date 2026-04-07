import axios, { AxiosError, AxiosHeaders, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || ''
const API_TIMEOUT_MS = 10000
const MAX_RETRIES = 3
const BASE_RETRY_DELAY_MS = 400

let authToken: string | null = null

export interface ApiRequestConfig extends AxiosRequestConfig {
  skipAuth?: boolean
  skipRetry?: boolean
  _retryCount?: number
}

export class ApiError extends Error {
  status: number | null
  code: string | null
  details: unknown

  constructor(message: string, status: number | null, code: string | null, details: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function shouldRetry(error: AxiosError, config: ApiRequestConfig): boolean {
  if (config.skipRetry) {
    return false
  }

  const status = error.response?.status ?? null
  const retryCount = config._retryCount ?? 0
  const isNetworkError = !error.response
  const isRetryableStatus = status !== null && status >= 500

  return retryCount < MAX_RETRIES && (isNetworkError || isRetryableStatus)
}

function normalizeApiError(error: AxiosError): ApiError {
  const status = error.response?.status ?? null
  const code = error.code ?? null
  const details = error.response?.data ?? null

  if (status === 401) {
    return new ApiError('Unauthorized. Please sign in again.', status, code, details)
  }

  if (status === 403) {
    return new ApiError('Forbidden. You do not have permission to perform this action.', status, code, details)
  }

  if (status === 404) {
    return new ApiError('Resource not found.', status, code, details)
  }

  if (status !== null && status >= 500) {
    return new ApiError('Server error. Please try again in a moment.', status, code, details)
  }

  if (!status) {
    return new ApiError('Network error. Please check your connection.', status, code, details)
  }

  return new ApiError(error.message || 'An unexpected API error occurred.', status, code, details)
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const customConfig = config as InternalAxiosRequestConfig & ApiRequestConfig

  if (authToken && !customConfig.skipAuth) {
    const headers = new AxiosHeaders(customConfig.headers)
    headers.set('Authorization', `Bearer ${authToken}`)
    customConfig.headers = headers
  }

  return customConfig
})

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const customConfig = (error.config ?? {}) as ApiRequestConfig

    if (shouldRetry(error, customConfig)) {
      const retryCount = (customConfig._retryCount ?? 0) + 1
      customConfig._retryCount = retryCount

      const retryDelay = BASE_RETRY_DELAY_MS * 2 ** (retryCount - 1)
      await delay(retryDelay)

      return api.request(customConfig)
    }

    throw normalizeApiError(error)
  },
)

export function setAuthToken(token: string | null): void {
  authToken = token
}

export function clearAuthToken(): void {
  authToken = null
}

export async function apiRequest<T>(config: ApiRequestConfig): Promise<T> {
  const response = await api.request<T>(config)
  return response.data
}

export async function get<T>(url: string, config?: ApiRequestConfig): Promise<T> {
  return apiRequest<T>({ ...config, method: 'GET', url })
}

export async function post<T, TBody = unknown>(url: string, body?: TBody, config?: ApiRequestConfig): Promise<T> {
  return apiRequest<T>({ ...config, method: 'POST', url, data: body })
}

export async function put<T, TBody = unknown>(url: string, body?: TBody, config?: ApiRequestConfig): Promise<T> {
  return apiRequest<T>({ ...config, method: 'PUT', url, data: body })
}

export async function remove<T>(url: string, config?: ApiRequestConfig): Promise<T> {
  return apiRequest<T>({ ...config, method: 'DELETE', url })
}
