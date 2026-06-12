import { useEffect, useRef, useState } from 'react' //useEffect = connect to socket when app loads
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import { io } from 'socket.io-client' // io = create socket connection
import './App.css'
import bedroom from './assets/room/bedroom.svg'
import codexIcon from './assets/agents/codex.svg'
import claudeIcon from './assets/agents/claude.svg'
import codexSprite1 from './assets/agents-sprite/codex-sprite/codex-sprite1.svg'
import codexSprite2 from './assets/agents-sprite/codex-sprite/codex-sprite2.svg'
import codexSprite3 from './assets/agents-sprite/codex-sprite/codex-sprite3.svg'
import codexSprite4 from './assets/agents-sprite/codex-sprite/codex-sprite4.svg'
import codexSprite5 from './assets/agents-sprite/codex-sprite/codex-sprite5.svg'
import codexSprite6 from './assets/agents-sprite/codex-sprite/codex-sprite6.svg'
import codexSprite7 from './assets/agents-sprite/codex-sprite/codex-sprite7.svg'
import claudeSprite1 from './assets/agents-sprite/claude-sprite/claude-sprite1.svg'
import claudeSprite2 from './assets/agents-sprite/claude-sprite/claude-sprite2.svg'
import claudeSprite3 from './assets/agents-sprite/claude-sprite/claude-sprite3.svg'
import claudeSprite4 from './assets/agents-sprite/claude-sprite/claude-sprite4.svg'
import claudeSprite5 from './assets/agents-sprite/claude-sprite/claude-sprite5.svg'
import claudeSprite6 from './assets/agents-sprite/claude-sprite/claude-sprite6.svg'
import claudeSprite7 from './assets/agents-sprite/claude-sprite/claude-sprite7.svg'
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

type AgentMotion = {
  x: number
  y: number
  duration: number
}

type SpriteAnimation = {
  frame: number
  loops: number
  playing: boolean
  animationKey: string
}

type StateUpdateLog = {
  id: string
  agentName: string
  state: AgentState
  timestamp: string
}

const floorArea = {
  centerX: 50,
  topY: 23,
  middleY: 51,
  bottomY: 79,
  maxHalfWidth: 43,
  edgePadding: 7,
}

const startingPositions: Record<string, AgentMotion> = {
  codex: { x: 62, y: 55, duration: 16000 },
  claude: { x: 46, y: 68, duration: 18000 },
}

const startingSpriteAnimations: Record<string, SpriteAnimation> = {
  codex: { frame: 0, loops: 0, playing: false, animationKey: 'codex-resting' },
  claude: { frame: 0, loops: 0, playing: false, animationKey: 'claude-resting' },
}

function getFloorXRange(y: number) {
  const yDistanceFromMiddle = Math.abs(y - floorArea.middleY)
  const halfHeight = floorArea.middleY - floorArea.topY
  const halfWidth = floorArea.maxHalfWidth * (1 - yDistanceFromMiddle / halfHeight)
  const safeHalfWidth = Math.max(0, halfWidth - floorArea.edgePadding)

  return {
    minX: floorArea.centerX - safeHalfWidth,
    maxX: floorArea.centerX + safeHalfWidth,
  }
}

function clampFloorPosition(x: number, y: number) {
  const clampedY = Math.min(Math.max(y, floorArea.topY), floorArea.bottomY)
  const { minX, maxX } = getFloorXRange(clampedY)

  return {
    x: Math.min(Math.max(x, minX), maxX),
    y: clampedY,
  }
}

function getRandomMotion() {
  const y = floorArea.topY + Math.random() * (floorArea.bottomY - floorArea.topY)
  const { minX, maxX } = getFloorXRange(y)

  return {
    x: minX + Math.random() * (maxX - minX),
    y,
    duration: 12000 + Math.random() * 9000,
  }
}

function getRandomMoveDelay() {
  return 8000 + Math.random() * 8000
}

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

const agentSpriteFrames: Record<string, string[]> = {
  codex: [
    codexSprite1,
    codexSprite2,
    codexSprite3,
    codexSprite4,
    codexSprite5,
    codexSprite6,
    codexSprite7,
  ],
  claude: [
    claudeSprite1,
    claudeSprite2,
    claudeSprite3,
    claudeSprite4,
    claudeSprite5,
    claudeSprite6,
    claudeSprite7,
  ],
}

function getAgentAnimationKey(agent: Agent) {
  return `${agent.id}-${agent.state}-${agent.lastUpdate ?? ''}`
}

function getUpdatedSpriteAnimations(currentAnimations: Record<string, SpriteAnimation>, nextAgents: Agent[]) {
  let changed = false
  const nextAnimations = { ...currentAnimations }

  nextAgents
    .filter((agent) => agent.id === 'codex' || agent.id === 'claude')
    .forEach((agent) => {
      const animationKey = getAgentAnimationKey(agent)
      const currentAnimation = currentAnimations[agent.id]

      if (agent.state === 'resting') {
        if (currentAnimation.playing || currentAnimation.animationKey !== animationKey) {
          nextAnimations[agent.id] = { frame: 0, loops: 0, playing: false, animationKey }
          changed = true
        }

        return
      }

      if (currentAnimation.animationKey !== animationKey) {
        nextAnimations[agent.id] = { frame: 0, loops: 0, playing: true, animationKey }
        changed = true
      }
    })

  return changed ? nextAnimations : currentAnimations
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
  const [agentPositions, setAgentPositions] = useState(startingPositions)
  const [spriteAnimations, setSpriteAnimations] = useState(startingSpriteAnimations)
  const [draggingAgentId, setDraggingAgentId] = useState<string | null>(null)
  const [updateLogs, setUpdateLogs] = useState<StateUpdateLog[]>([])
  const [updatesPanelOpen, setUpdatesPanelOpen] = useState(true)
  const roomStageRef = useRef<HTMLDivElement>(null)
  const updatesListRef = useRef<HTMLDivElement>(null)

  function addStateUpdateLog(agent: Agent) {
    if ((agent.id !== 'codex' && agent.id !== 'claude') || agent.state !== 'finished') {
      return
    }

    const timestamp = agent.lastUpdate ?? new Date().toISOString()
    const logId = `${agent.id}-${agent.state}-${timestamp}`

    setUpdateLogs((currentLogs) => {
      const logAlreadyExists = currentLogs.some((log) => log.id === logId)

      if (logAlreadyExists) {
        return currentLogs
      }

      return [
        ...currentLogs,
        {
          id: logId,
          agentName: agent.name,
          state: agent.state,
          timestamp,
        },
      ].slice(-20)
    })
  }

  function formatLogTime(timestamp: string) {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  useEffect(() => {
    fetch('http://localhost:3001/agents')
      .then((response) => response.json())
      .then((backendAgents: Agent[]) => {
        setBackendStatus('online')
        setAgents(backendAgents)
        setSpriteAnimations((currentAnimations) => getUpdatedSpriteAnimations(currentAnimations, backendAgents))
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

    socket.on('agent:update', (updatedAgent: Agent) => {
      setAgents((currentAgents) => {
        const previousAgent = currentAgents.find((agent) => agent.id === updatedAgent.id)
        const nextAgents = currentAgents.map((agent) => 
          agent.id === updatedAgent.id ? updatedAgent : agent
        )

        if (previousAgent && previousAgent.state !== updatedAgent.state) {
          addStateUpdateLog(updatedAgent)
        }

        setSpriteAnimations((currentAnimations) => getUpdatedSpriteAnimations(currentAnimations, nextAgents))

        return nextAgents
      })
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
          setAgents((currentAgents) => {
            const previousAgent = currentAgents.find((agent) => agent.id === finishedAgent.id)
            const nextAgents = currentAgents.map((agent) =>
              agent.id === finishedAgent.id
                ? {
                    ...agent,
                    state: 'resting' as AgentState,
                    activity: 'Online but not doing anything',
                    lastUpdate: new Date().toISOString(),
                  }
                : agent
            )

            const updatedAgent = nextAgents.find((agent) => agent.id === finishedAgent.id)

            if (previousAgent && updatedAgent && previousAgent.state !== updatedAgent.state) {
              addStateUpdateLog(updatedAgent)
            }

            setSpriteAnimations((currentAnimations) => getUpdatedSpriteAnimations(currentAnimations, nextAgents))

            return nextAgents
          })
        })
      }, 30000)
    )

    return () => {
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId))
    }
  }, [agents])

  useEffect(() => {
    const timeoutIds: number[] = []
    const restingAgentIds = agents
      .filter((agent) => {
        const spriteAnimation = spriteAnimations[agent.id]

        return (
          (agent.id === 'codex' || agent.id === 'claude') &&
          agent.id !== draggingAgentId &&
          (agent.state === 'resting' || !spriteAnimation?.playing)
        )
      })
      .map((agent) => agent.id)

    function scheduleAgentMove(agentId: string) {
      const timeoutId = window.setTimeout(() => {
        setAgentPositions((currentPositions) => ({
          ...currentPositions,
          [agentId]: getRandomMotion(),
        }))

        scheduleAgentMove(agentId)
      }, getRandomMoveDelay())

      timeoutIds.push(timeoutId)
    }

    restingAgentIds.forEach((agentId) => {
      scheduleAgentMove(agentId)
    })

    return () => {
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId))
    }
  }, [agents, spriteAnimations, draggingAgentId])

  useEffect(() => {
    const timeoutIds = Object.entries(spriteAnimations)
      .filter(([, spriteAnimation]) => spriteAnimation.playing)
      .map(([agentId, spriteAnimation]) =>
        window.setTimeout(() => {
          setSpriteAnimations((currentAnimations) => {
            const currentAnimation = currentAnimations[agentId]

            if (!currentAnimation.playing) {
              return currentAnimations
            }

            const nextFrame = currentAnimation.frame === 6 ? 0 : currentAnimation.frame + 1
            const nextLoops = currentAnimation.frame === 6 ? currentAnimation.loops + 1 : currentAnimation.loops
            const nextPlaying = nextLoops < 4

            return {
              ...currentAnimations,
              [agentId]: {
                ...currentAnimation,
                frame: nextPlaying ? nextFrame : 0,
                loops: nextLoops,
                playing: nextPlaying,
              },
            }
          })
        }, spriteAnimation.frame === 6 ? 900 : 180)
      )

    return () => {
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId))
    }
  }, [spriteAnimations])

  useEffect(() => {
    if (!draggingAgentId) {
      return
    }

    const activeDraggingAgentId = draggingAgentId

    function moveDraggedAgent(event: PointerEvent) {
      const roomStage = roomStageRef.current

      if (!roomStage) {
        return
      }

      const roomRect = roomStage.getBoundingClientRect()
      const pointerX = ((event.clientX - roomRect.left) / roomRect.width) * 100
      const pointerY = ((event.clientY - roomRect.top) / roomRect.height) * 100
      const nextPosition = clampFloorPosition(pointerX, pointerY)

      setAgentPositions((currentPositions) => ({
        ...currentPositions,
        [activeDraggingAgentId]: {
          ...currentPositions[activeDraggingAgentId],
          ...nextPosition,
          duration: 0,
        },
      }))
    }

    function stopDragging() {
      setAgentPositions((currentPositions) => ({
        ...currentPositions,
        [activeDraggingAgentId]: {
          ...currentPositions[activeDraggingAgentId],
          duration: 14000,
        },
      }))
      setDraggingAgentId(null)
    }

    window.addEventListener('pointermove', moveDraggedAgent)
    window.addEventListener('pointerup', stopDragging)
    window.addEventListener('pointercancel', stopDragging)

    return () => {
      window.removeEventListener('pointermove', moveDraggedAgent)
      window.removeEventListener('pointerup', stopDragging)
      window.removeEventListener('pointercancel', stopDragging)
    }
  }, [draggingAgentId])

  useEffect(() => {
    if (!updatesPanelOpen || !updatesListRef.current) {
      return
    }

    updatesListRef.current.scrollTop = updatesListRef.current.scrollHeight
  }, [updateLogs, updatesPanelOpen])

  function startDraggingAgent(agentId: string, event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault()
    setDraggingAgentId(agentId)
  }

  const visibleAgents = agents.filter((agent) => agent.id === 'codex' || agent.id === 'claude')
  const claudeUpdateLogs = updateLogs.filter((log) => log.agentName === 'Claude')
  const codexUpdateLogs = updateLogs.filter((log) => log.agentName === 'Codex')

  return (
    <main className='workspace-scene'>
      <div className={`backend-status backend-status-${backendStatus}`}>
        Backend {backendStatus}
      </div>
      <section className={`updates-panel ${updatesPanelOpen ? 'updates-panel-open' : 'updates-panel-closed'}`}>
        <button className='updates-toggle' type='button' onClick={() => setUpdatesPanelOpen((isOpen) => !isOpen)}>
          {updatesPanelOpen ? 'Close updates' : 'Open updates'}
        </button>
        {updatesPanelOpen && (
          <div className='updates-list' ref={updatesListRef}>
            {updateLogs.length === 0 ? (
              <p className='updates-empty'>No finished updates yet</p>
            ) : (
              <div className='updates-columns'>
                <div className='updates-column'>
                  <p className='updates-column-title'>Claude</p>
                  {claudeUpdateLogs.map((log) => (
                    <p className='updates-log' key={log.id}>
                      <span>{formatLogTime(log.timestamp)}</span>
                      <span>finished</span>
                    </p>
                  ))}
                </div>
                <div className='updates-column'>
                  <p className='updates-column-title'>Codex</p>
                  {codexUpdateLogs.map((log) => (
                    <p className='updates-log' key={log.id}>
                      <span>{formatLogTime(log.timestamp)}</span>
                      <span>finished</span>
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
      <div className='room-stage' ref={roomStageRef}>
        <img className='room-background' src={bedroom} alt='' draggable={false} />
        <section className='agents-layer'>
          {visibleAgents.map((agent) => {
            const agentPosition = agentPositions[agent.id]
            const agentIsResting = agent.state === 'resting'
            const spriteAnimation = spriteAnimations[agent.id]
            const agentIsAnimating = spriteAnimation.playing
            const agentIsDragging = draggingAgentId === agent.id
            const agentImage = agentIsAnimating ? agentSpriteFrames[agent.id][spriteAnimation.frame] : agentIcons[agent.id]
            const agentStyle = {
              left: `${agentPosition.x}%`,
              top: `${agentPosition.y}%`,
              transitionDuration: agentIsAnimating || agentIsDragging ? '0ms' : `${agentPosition.duration}ms`,
              zIndex: agentIsDragging ? 12 : agentIsResting ? 4 : 8,
            } satisfies CSSProperties

            return (
            <div className={`visual-agent visual-agent-${agent.id} ${agentIsDragging ? 'visual-agent-dragging' : ''}`} key={agent.id} style={agentStyle} onPointerDown={(event) => startDraggingAgent(agent.id, event)}>
              <div className='agent-drag-visuals'>
                <img className='thought-bubble' src={thoughtBubble} alt='' draggable={false} />
                <img className={`state-icon state-icon-${agent.state}`} src={stateIcons[agent.state]} alt='' draggable={false} />
                <img className={`agent-sprite agent-sprite-${agent.id} ${agentIsAnimating ? 'agent-sprite-animated' : 'agent-sprite-static'} ${agentIsDragging ? 'agent-sprite-dragging' : ''}`} src={agentImage} alt='' draggable={false} />
              </div>
            </div>
            )
          })}
        </section>
      </div>
    </main>
  )
}

export default App
