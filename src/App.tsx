import { useEffect, useState } from 'react' //useEffect = connect to socket when app loads
import { io } from 'socket.io-client' // io = create socket connection
import './App.css'

type AgentState =
  | 'resting'
  | 'working'
  | 'reading'
  | 'thinking'
  | 'running_tool'
  | 'needs_approval'
  | 'blocked'
  | 'finished'

type Agent = {
  id: string
  name: string
  role: string
  state: AgentState
  activity: string
  position: string
  lastUpdate?: string
}

function App() {
  const fallbackAgents: Agent[] = [
    { name: "Codex", 
      id: "codex", 
      role: "Coding Agent", 
      state: "resting", 
      activity: "Online but not doing anything", 
      position: "left"
    },
    { name: "Claude", 
      id: "claude", 
      role: "Research Agent", 
      state: "reading", 
      activity: "reading documentation", 
      position: "center"
    },
    { name: "ChatGPT", 
      id: "chatgpt", 
      role: "Ideas Agent", 
      state: "thinking", 
      activity: "sorting ideas", 
      position: "right"
    }
  ]

  const [agents, setAgents] = useState(fallbackAgents) 
  const [backendConnected, setBackendConnected] = useState(false)

  useEffect(() => {
    fetch('http://localhost:3001/agents')
      .then((response) => response.json())
      .then((backendAgents: Agent[]) => {
        setAgents(backendAgents)
        setBackendConnected(true)
      })
      .catch(() => {
        setBackendConnected(false)
      })

    const socket = io('http://localhost:3001')

    socket.on('connect', () => {
      setBackendConnected(true)
    })

    socket.on('disconnect', () => {
      setBackendConnected(false)
    })

    socket.on('connect_error', () => {
      setBackendConnected(false)
    })

    socket.on('agent:update', (updatedAgent) => {
      setAgents((currentAgents) => 
        currentAgents.map((agent) => 
          agent.id === updatedAgent.id ? updatedAgent : agent
        )
      )
    })
    return () => {
      socket.disconnect()
    }
  }, [])

  useEffect(() => {
    const finishedAgents = agents.filter((agent) => agent.state === 'finished')

    if (finishedAgents.length === 0) {
      return
    }

    const timeoutIds = finishedAgents.map((finishedAgent) =>
      window.setTimeout(() => {
        fetch('http://localhost:3001/events', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            agentId: finishedAgent.id,
            state: 'resting',
            activity: 'Online but not doing anything',
          }),
        }).catch(() => {
          setAgents((currentAgents) =>
            currentAgents.map((agent) =>
              agent.id === finishedAgent.id
                ? {
                    ...agent,
                    state: 'resting',
                    activity: 'Online but not doing anything',
                    lastUpdate: new Date().toISOString(),
                  }
                : agent
            )
          )
        })
      }, 60000)
    )

    return () => {
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId))
    }
  }, [agents])

  function updateAgentState(agentId: string, newState: AgentState, newActivity: string) {
    fetch('http://localhost:3001/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agentId,
        state: newState,
        activity: newActivity,
      }),
    }).catch(() => {
      setAgents((currentAgents) =>
        currentAgents.map((agent) =>
          agent.id === agentId
            ? {
                ...agent,
                state: 'blocked',
                activity: `Backend disconnected. Cannot send ${agent.name} update.`,
                lastUpdate: new Date().toISOString(),
              }
            : agent
        )
      )
    })
  }

  function updateClaudeState(newState: AgentState, newActivity: string) {
    updateAgentState('claude', newState, newActivity)
  }

  function updateCodexState(newState: AgentState, newActivity: string) {
    updateAgentState('codex', newState, newActivity)
  }

  function startCodexSession() {
    fetch('http://localhost:3001/codex/open', {
      method: 'POST',
    }).catch(() => {
      updateCodexState('blocked', 'Backend disconnected. Cannot open Codex session.')
    })
  }

  return ( //display UI
    <main>
      <header>
        <h1>AI Workspace Doc</h1>
        <p className={`connection-status ${backendConnected ? 'connection-online' : 'connection-offline'}`}>
          Backend {backendConnected ? 'connected' : 'disconnected'}
        </p>
        </header>
      <section className='agent-room'>
        <div className='agent-grid'>
          {agents.map((agent) => (
            <div className={`agent-card position-${agent.position} state-${agent.state}`} key={agent.id}>
              <div className='agent-avatar'>{agent.name[0]}</div>
              <h2 className='agent-name'>{agent.name}</h2>
              <p className='agent-role'>{agent.role}</p>
              <p className={`agent-state state-badge-${agent.state}`}>State: {agent.state}</p>
              <p className='agent-activity'>{agent.activity}</p>

              {/* only show this if the agent has a lastUpdate */}
              {agent.lastUpdate && ( 
                <p className="agent-updated">
                  Updated: {new Date(agent.lastUpdate).toLocaleTimeString()}
                </p>
              )}

            </div>
          ))}
        </div>
      </section>
      <div className='controls'>
        <p>Control Buttons</p>

        <div className='control-panels'>
          <div className='control-group'>
            <p className='control-label'>Codex</p>
            <button className='start-session-button' onClick={startCodexSession}>
              Open Codex Session
            </button>
            <div className='button-grid'>
              <button onClick={() => updateCodexState('thinking', 'Thinking through the coding task')}>
                Thinking
              </button>
              <button onClick={() => updateCodexState('working', 'Working on project files')}>
                Working
              </button>
              <button onClick={() => updateCodexState('running_tool', 'Running a development tool')}>
                Running Tool
              </button>
              <button onClick={() => updateCodexState('needs_approval', 'Waiting for your approval')}>
                Needs Approval
              </button>
              <button onClick={() => updateCodexState('blocked', 'Blocked by missing information')}>
                Blocked
              </button>
              <button onClick={() => updateCodexState('finished', 'Finished the current coding task')}>
                Finished
              </button>
              <button onClick={() => updateCodexState('resting', 'Online but not doing anything')}>
                Resting
              </button>
            </div>
          </div>

          <div className='control-group'>
            <p className='control-label'>Claude</p>
            <div className='button-grid'>
              <button onClick={() => updateClaudeState('thinking', 'Thinking through the research plan')}>
                Thinking
              </button>
              <button onClick={() => updateClaudeState('working', 'Summarizing project context')}>
                Working
              </button>
              <button onClick={() => updateClaudeState('running_tool', 'Running a document search')}>
                Running Tool
              </button>
              <button onClick={() => updateClaudeState('needs_approval', 'Waiting for your approval')}>
                Needs Approval
              </button>
              <button onClick={() => updateClaudeState('blocked', 'Blocked by missing information')}>
                Blocked
              </button>
              <button onClick={() => updateClaudeState('finished', 'Finished reading the documentation')}>
                Finished
              </button>
              <button onClick={() => updateClaudeState('resting', 'Online but not doing anything')}>
                Resting
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

export default App
