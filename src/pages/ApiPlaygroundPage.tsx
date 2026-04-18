import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../services/api/client'
import {
  getHealthExample,
  getNotificationsExample,
  getOkExample,
  getTeamsExample,
  getUsersExample,
  testWebhookExample,
  type NotificationRecord,
  type NotificationsResponse,
  type TeamRecord,
  type TeamsResponse,
  type UserRecord,
  type UsersResponse,
  type WebhookTestResponse,
} from '../services/api/exampleApi'

type EndpointId = 'ok' | 'health' | 'users' | 'notifications' | 'teams' | 'webhookTest'

interface EndpointResult {
  isLoading: boolean
  data: string
  error: string
  response: unknown | null
}

interface EndpointDefinition {
  id: EndpointId
  title: string
  description: string
  endpointPath: string
  run: () => Promise<unknown>
}

const endpointDefinitions: EndpointDefinition[] = [
  {
    id: 'ok',
    title: 'System Ping',
    description: 'Lightweight endpoint to verify API availability.',
    endpointPath: '/mock-api/ok.json',
    run: getOkExample,
  },
  {
    id: 'health',
    title: 'Service Health',
    description: 'Returns health details including service timestamp.',
    endpointPath: '/mock-api/health.json',
    run: getHealthExample,
  },
  {
    id: 'users',
    title: 'Sample Users',
    description: 'Fetches a demo collection of users from mock API.',
    endpointPath: '/mock-api/users.json',
    run: getUsersExample,
  },
  {
    id: 'teams',
    title: 'Team List',
    description: 'Fetches team catalog used by user Team Subscription lookups.',
    endpointPath: '/mock-api/teams.json',
    run: getTeamsExample,
  },
  {
    id: 'notifications',
    title: 'Notifications Feed',
    description: 'Fetches notification records for home preview and full list view.',
    endpointPath: '/mock-api/notifications.json',
    run: getNotificationsExample,
  },
  {
    id: 'webhookTest',
    title: 'Webhook Test',
    description: 'Sends a test payload to the configured Power Automate webhook URL and reports the response.',
    endpointPath: '/api/webhooks/test',
    run: testWebhookExample,
  },
]

const initialResults: Record<EndpointId, EndpointResult> = {
  ok: { isLoading: false, data: '', error: '', response: null },
  health: { isLoading: false, data: '', error: '', response: null },
  users: { isLoading: false, data: '', error: '', response: null },
  teams: { isLoading: false, data: '', error: '', response: null },
  notifications: { isLoading: false, data: '', error: '', response: null },
  webhookTest: { isLoading: false, data: '', error: '', response: null },
}

function getUsersFromResponse(response: unknown): UserRecord[] {
  if (!response || typeof response !== 'object' || !('users' in response)) {
    return []
  }

  const typedResponse = response as UsersResponse
  return Array.isArray(typedResponse.users) ? typedResponse.users : []
}

function getNotificationsFromResponse(response: unknown): NotificationRecord[] {
  if (!response || typeof response !== 'object' || !('notifications' in response)) {
    return []
  }

  const typedResponse = response as NotificationsResponse
  return Array.isArray(typedResponse.notifications) ? typedResponse.notifications : []
}

function getTeamsFromResponse(response: unknown): TeamRecord[] {
  if (!response || typeof response !== 'object' || !('teams' in response)) {
    return []
  }

  const typedResponse = response as TeamsResponse
  return Array.isArray(typedResponse.teams) ? typedResponse.teams : []
}

function getWebhookResultFromResponse(response: unknown): WebhookTestResponse | null {
  if (!response || typeof response !== 'object' || !('success' in response)) return null
  return response as WebhookTestResponse
}

export default function ApiPlaygroundPage() {
  const [results, setResults] = useState<Record<EndpointId, EndpointResult>>(initialResults)

  async function runEndpoint(endpoint: EndpointDefinition) {
    setResults(prev => ({
      ...prev,
      [endpoint.id]: { isLoading: true, data: '', error: '', response: null },
    }))

    try {
      const response = await endpoint.run()
      setResults(prev => ({
        ...prev,
        [endpoint.id]: {
          isLoading: false,
          data: JSON.stringify(response, null, 2),
          error: '',
          response,
        },
      }))
    } catch (error) {
      const message = error instanceof ApiError
        ? error.message
        : 'Unexpected error while running endpoint.'

      setResults(prev => ({
        ...prev,
        [endpoint.id]: { isLoading: false, data: '', error: message, response: null },
      }))
    }
  }

  return (
    <div className="playground-page">
      <header className="playground-header">
        <div>
          <h1 className="playground-title">API Playground</h1>
          <p className="playground-subtitle">Run demo endpoints and inspect responses.</p>
        </div>
        <Link to="/" className="btn btn-secondary">Back Home</Link>
      </header>

      <main className="playground-grid">
        {endpointDefinitions.map(endpoint => {
          const endpointState = results[endpoint.id]
          const endpointUrl = new URL(endpoint.endpointPath, window.location.origin).toString()
          const users = endpoint.id === 'users' ? getUsersFromResponse(endpointState.response) : []
          const teams = endpoint.id === 'teams' ? getTeamsFromResponse(endpointState.response) : []
          const notifications = endpoint.id === 'notifications'
            ? getNotificationsFromResponse(endpointState.response)
            : []
          const webhookResult = endpoint.id === 'webhookTest'
            ? getWebhookResultFromResponse(endpointState.response)
            : null

          return (
            <article className="playground-card" key={endpoint.id}>
              <h2>{endpoint.title}</h2>
              <p>{endpoint.description}</p>
              <button
                className="btn"
                onClick={() => runEndpoint(endpoint)}
                disabled={endpointState.isLoading}
              >
                {endpointState.isLoading ? 'Running...' : 'Run Endpoint'}
              </button>

              <div className="playground-endpoint-url">
                <span className="url-label">Endpoint URL</span>
                <code>{endpointUrl}</code>
              </div>

              {endpoint.id === 'users' && users.length > 0 && (
                <div className="playground-table-wrap">
                  <table className="playground-users-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Team Subscription</th>
                        <th>Date Created</th>
                        <th>Date Modified</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(user => (
                        <tr key={user.id}>
                          <td>{user.id}</td>
                          <td>{user.name}</td>
                          <td>{user.email}</td>
                          <td>{user.role}</td>
                          <td>{user.team_subscriptions.join(', ') || 'None'}</td>
                          <td>{user.date_created}</td>
                          <td>{user.date_modified}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {endpoint.id === 'teams' && teams.length > 0 && (
                <div className="playground-table-wrap">
                  <table className="playground-users-table teams-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teams.map(team => (
                        <tr key={team.id}>
                          <td>{team.id}</td>
                          <td>{team.name}</td>
                          <td>{team.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {endpoint.id === 'notifications' && notifications.length > 0 && (
                <div className="playground-table-wrap">
                  <table className="playground-users-table notifications-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Title</th>
                        <th>Message</th>
                        <th>Type</th>
                        <th>Read</th>
                        <th>Date Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {notifications.map(item => (
                        <tr key={item.id}>
                          <td>{item.id}</td>
                          <td>{item.title}</td>
                          <td>{item.message}</td>
                          <td>{item.type}</td>
                          <td>{item.is_read ? 'Yes' : 'No'}</td>
                          <td>{item.date_created}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {endpoint.id === 'webhookTest' && webhookResult && (
                <div className={`playground-webhook-result ${webhookResult.success ? 'success' : 'failure'}`}>
                  <p><strong>{webhookResult.success ? '✓' : '✗'} {webhookResult.message}</strong></p>
                  {webhookResult.payload_sent && (
                    <>
                      <p><strong>Payload Sent</strong></p>
                      <pre className="playground-result">{JSON.stringify(webhookResult.payload_sent, null, 2)}</pre>
                    </>
                  )}
                  {webhookResult.pa_response != null && (
                    <>
                      <p><strong>Power Automate Response</strong></p>
                      <pre className="playground-result">
                        {typeof webhookResult.pa_response === 'string'
                          ? webhookResult.pa_response
                          : JSON.stringify(webhookResult.pa_response, null, 2)}
                      </pre>
                    </>
                  )}
                </div>
              )}

              {endpoint.id === 'webhookTest' && !webhookResult && endpointState.data && (
                <div className="playground-webhook-result failure">
                  <p><strong>Unexpected response format. Showing raw response below.</strong></p>
                </div>
              )}

              {endpointState.data && (
                <pre className="playground-result">{endpointState.data}</pre>
              )}
              {endpointState.error && (
                <p className="playground-error">{endpointState.error}</p>
              )}
            </article>
          )
        })}
      </main>
    </div>
  )
}
