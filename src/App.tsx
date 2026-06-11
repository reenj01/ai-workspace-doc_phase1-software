import { useEffect, useState } from 'react' //useEffect = connect to socket when app loads
import { io } from 'socket.io-client' // io = create socket connection
import './App.css'
import bedroom from './assets/room/bedroom.svg'
import codexIcon from './assets/agents/codex.svg'
import claudeIcon from './assets/agents/claude.svg'
import thoughtBubble from './assets/states/thought-bubble.svg'
import restingIcon from './assets/states/resting.svg'
import thinkingIcon from './assets/states/thinking.svg'
import workingIcon from './assets/states/working.svg'
import runningToolIcon from './assets/states/running_tool.svg'
import needsApprovalIcon from './assets/states/needs_approval.svg'
import blockedIcon from './assets/states/blocked.svg'
import finishedIcon from './assets/states/finished.svg'

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

type BackendStatus = 'checking' | 'online' | 'offline'

const stateIcons: Record<AgentState, string> = {
  resting: restingIcon,
  working: workingIcon,
  reading: thinkingIcon,
  thinking: thinkingIcon,
  running_tool: runningToolIcon,
  needs_approval: needsApprovalIcon,
  blocked: blockedIcon,
  finished: finishedIcon,
}

const agentIcons: Record<string, string> = {
  codex: codexIcon,
  claude: claudeIcon,
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
  const [backendStatus, setBackendStatus] = useState<BackendStatus>('checking')

  useEffect(() => {
    fetch('http://localhost:3001/agents')
      .then((response) => response.json())
      .then((backendAgents: Agent[]) => {
        setBackendStatus('online')
        setAgents(backendAgents)
      })
      .catch(() => {
        setBackendStatus('offline')
      })

    const socket = io('http://localhost:3001')

    socket.on('connect', () => {
      setBackendStatus('online')
    })

    socket.on('disconnect', () => {
      setBackendStatus('offline')
    })

    socket.on('connect_error', () => {
      setBackendStatus('offline')
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
      }, 30000)
    )

    return () => {
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId))
    }
  }, [agents])

  const visibleAgents = agents.filter((agent) => agent.id === 'codex' || agent.id === 'claude')

  return (
    <main className='workspace-scene'>
      <div className={`backend-status backend-status-${backendStatus}`}>
        Backend {backendStatus}
      </div>
      <img className='room-background' src={bedroom} alt='' draggable={false} />
      <section className='agents-layer'>
        {visibleAgents.map((agent) => (
          <div className={`visual-agent visual-agent-${agent.id}`} key={agent.id}>
            <img className='thought-bubble' src={thoughtBubble} alt='' draggable={false} />
            <img className={`state-icon state-icon-${agent.state}`} src={stateIcons[agent.state]} alt='' draggable={false} />
            <img className='agent-sprite' src={agentIcons[agent.id]} alt='' draggable={false} />
          </div>
          ))}
      </section>
    </main>
  )
}

export default App
