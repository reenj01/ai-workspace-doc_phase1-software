import { useEffect, useState } from 'react' //useEffect = connect to socket when app loads
import { io } from 'socket.io-client' // io = create socket connection
import './App.css'

type AgentState =
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
  const startingAgents: Agent[] = [
    { name: "Codex", 
      id: "codex", 
      role: "Coding Agent", 
      state: "working", 
      activity: "editing project files", 
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

  const [agents, setAgents] = useState(startingAgents) 

  //connects React to backend
  useEffect(() => {
    fetch('http://localhost:3001/agents')
      .then((response) => response.json())
      .then((backendAgents: Agent[]) => {
        setAgents(backendAgents) // replace hardcoded frontend agents with backend agents
      })

    const socket = io('http://localhost:3001')

    //listens for agent:update events
    socket.on('agent:update', (updatedAgent) => {
      setAgents((currentAgents) => 
        //updates matching agent on screen
        currentAgents.map((agent) => 
          agent.id === updatedAgent.id ? updatedAgent : agent
        )
      )
    })
    return () => {
      socket.disconnect()
    }
  }, [])

  function updateClaudeState(newState: AgentState, newActivity: string) {
    fetch('http://localhost:3001/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agentId: 'claude',
        state: newState,
        activity: newActivity,
      }),
    }).catch(() => {
      setAgents((currentAgents) =>
        currentAgents.map((agent) =>
          agent.id === 'claude'
            ? {
                ...agent,
                state: 'blocked',
                activity: 'Backend disconnected. Cannot send Claude update.',
                lastUpdate: new Date().toISOString(),
              }
            : agent
        )
      )
    })
  }

  return ( //display UI
    <main>
      <header>
        <h1>AI Workspace Doc</h1>
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

        <div className='button-row'>
          <button onClick={() => updateClaudeState('thinking', 'Thinking through the research plan')}>
            Claude Thinking
          </button>
          <button onClick={() => updateClaudeState('working', 'Summarizing project context')}>
            Claude Working
          </button>
          <button onClick={() => updateClaudeState('running_tool', 'Running a document search')}>
            Claude Running Tool
          </button>
          <button onClick={() => updateClaudeState('needs_approval', 'Waiting for your approval')}>
            Claude Needs Approval
          </button>
          <button onClick={() => updateClaudeState('blocked', 'Blocked by missing information')}>
            Claude Blocked
          </button>
          <button onClick={() => updateClaudeState('finished', 'Finished reading the documentation')}>
            Claude Finished
          </button>
        </div>
      </div>
    </main>
  )
}

export default App
