import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../services/api/client'
import { getHealthExample, getOkExample, getUsersExample } from '../services/api/exampleApi'

type EndpointId = 'ok' | 'health' | 'users'

interface EndpointResult {
  isLoading: boolean
  data: string
  error: string
}

interface EndpointDefinition {
  id: EndpointId
  title: string
  description: string
  run: () => Promise<unknown>
}

const endpointDefinitions: EndpointDefinition[] = [
  {
    id: 'ok',
    title: 'System Ping',
    description: 'Lightweight endpoint to verify API availability.',
    run: getOkExample,
  },
  {
    id: 'health',
    title: 'Service Health',
    description: 'Returns health details including service timestamp.',
    run: getHealthExample,
  },
  {
    id: 'users',
    title: 'Sample Users',
    description: 'Fetches a demo collection of users from mock API.',
    run: getUsersExample,
  },
]

const initialResults: Record<EndpointId, EndpointResult> = {
  ok: { isLoading: false, data: '', error: '' },
  health: { isLoading: false, data: '', error: '' },
  users: { isLoading: false, data: '', error: '' },
}

export default function ApiPlaygroundPage() {
  const [results, setResults] = useState<Record<EndpointId, EndpointResult>>(initialResults)

  async function runEndpoint(endpoint: EndpointDefinition) {
    setResults(prev => ({
      ...prev,
      [endpoint.id]: { isLoading: true, data: '', error: '' },
    }))

    try {
      const response = await endpoint.run()
      setResults(prev => ({
        ...prev,
        [endpoint.id]: {
          isLoading: false,
          data: JSON.stringify(response, null, 2),
          error: '',
        },
      }))
    } catch (error) {
      const message = error instanceof ApiError
        ? error.message
        : 'Unexpected error while running endpoint.'

      setResults(prev => ({
        ...prev,
        [endpoint.id]: { isLoading: false, data: '', error: message },
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
