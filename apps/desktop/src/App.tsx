import type { AppStatus, RelayEvent } from './types/bindings'
import { useEffect, useState } from 'react'
import { commands, events } from './types/bindings'
import './App.css'

function App() {
  const [status, setStatus] = useState<AppStatus | null>(null)
  const [prompt, setPrompt] = useState('Hello, who are you?')
  const [response, setResponse] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    commands.getAppStatus().then(setStatus)

    // 使用 tauri-specta 生成的 events 監聽
    const unlisten = events.relayEvent.listen((event) => {
      const payload: RelayEvent = event.payload
      console.log('Relay event:', payload)

      switch (payload.type) {
        case 'text':
          setResponse(prev => prev + payload.data)
          break
        case 'system':
          setSessionId(payload.data.session_id)
          break
        case 'tool_call':
          console.log(`Tool call: ${payload.data.name} (completed: ${payload.data.completed})`)
          break
        case 'error':
          setError(`${payload.data.code}: ${payload.data.message}`)
          setIsLoading(false)
          break
        case 'done':
          setIsLoading(false)
          break
      }
    })

    return () => {
      unlisten.then(f => f())
    }
  }, [])

  const handleRunRelay = async () => {
    setResponse('')
    setError(null)
    setIsLoading(true)

    try {
      const res = await commands.runCliRelay('cursor', prompt, sessionId, null)
      if (res.status === 'error') {
        setError(res.error)
        setIsLoading(false)
      }
      // Success is handled via events
    }
    catch (err) {
      setError(String(err))
      setIsLoading(false)
    }
  }

  return (
    <main className="container">
      <h1>Agent Relay Desktop</h1>

      <div className="card">
        <h2>System Status</h2>
        {status
          ? (
              <div>
                <p>
                  Version:
                  <strong>{status.version}</strong>
                </p>
                <p>
                  Status:
                  <span style={{ color: status.is_running ? 'green' : 'red' }}>
                    {status.is_running ? 'Running' : 'Stopped'}
                  </span>
                </p>
              </div>
            )
          : (
              <p>Loading status...</p>
            )}
      </div>

      <div className="card">
        <h2>AI Relay (Rust Backend)</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            disabled={isLoading}
            rows={3}
            style={{ width: '100%', padding: '8px' }}
          />
          <button onClick={handleRunRelay} disabled={isLoading}>
            {isLoading ? 'Running...' : 'Send to Cursor CLI'}
          </button>
        </div>

        {error && (
          <div style={{ color: 'red', marginTop: '10px', padding: '8px', border: '1px solid red' }}>
            {error}
          </div>
        )}

        {sessionId && (
          <div style={{ marginTop: '10px', fontSize: '0.8em', color: '#666' }}>
            Session ID:
            {' '}
            {sessionId}
          </div>
        )}

        <div style={{
          marginTop: '20px',
          padding: '15px',
          background: '#f4f4f4',
          borderRadius: '4px',
          minHeight: '100px',
          whiteSpace: 'pre-wrap',
          textAlign: 'left',
        }}
        >
          {response || (isLoading ? '...' : 'Response will appear here...')}
        </div>
      </div>
    </main>
  )
}

export default App
