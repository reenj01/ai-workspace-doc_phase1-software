import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { execFile } from 'child_process'

const app = express()
const PORT = 3001
// server that handles both normal Express routes & Socket.IO WebSocket connections
const server = createServer(app)
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
  }
})

// detects when the React app connects to backend
io.on('connection', (socket) => {
  console.log('Frontend connected:', socket.id)

  socket.on('disconnect', () => {
    console.log('Frontend disconnected:', socket.id)
  })
})

app.use(cors())
app.use(express.json())

let agents = [
  {
    id: 'codex',
    name: 'Codex',
    role: 'Coding Agent',
    state: 'resting',
    activity: 'Online but not doing anything',
    position: 'left',
    lastUpdate: new Date().toISOString()
  },
  {
    id: 'claude',
    name: 'Claude',
    role: 'Research Agent',
    state: 'reading',
    activity: 'Reading documentation',
    position: 'center',
    lastUpdate: new Date().toISOString()
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    role: 'Ideas Agent',
    state: 'thinking',
    activity: 'Sorting ideas',
    position: 'right',
    lastUpdate: new Date().toISOString()
  }
]

// GET /agents = show me the current agent states
app.get('/agents', (req, res) => {
  res.json(agents)
})

const claudeStateMap = {
  claude_resting: 'resting',
  claude_thinking: 'thinking',
  claude_working: 'working',
  claude_tool_use: 'running_tool',
  claude_needs_approval: 'needs_approval',
  claude_blocked: 'blocked',
  claude_finished: 'finished',
}

const codexStateMap = {
  codex_thinking: 'thinking',
  codex_working: 'working',
  codex_tool_use: 'running_tool',
  codex_needs_approval: 'needs_approval',
  codex_blocked: 'blocked',
  codex_finished: 'finished',
  codex_resting: 'resting',
}

function updateAgent(agentId, state, activity) {
  agents = agents.map((agent) =>
    agent.id === agentId
      ? {
          ...agent,
          state,
          activity,
          lastUpdate: new Date().toISOString()
        }
      : agent
  )

  const updatedAgent = agents.find((agent) => agent.id === agentId)
  io.emit('agent:update', updatedAgent)

  return updatedAgent
}

// POST /events = send an agent update
app.post('/events', (req, res) => {
  const { agentId, eventType, state, activity } = req.body

  //if the request has eventType, use the mapping table. Else, use the state directly
  const eventStateMap = {
    ...claudeStateMap,
    ...codexStateMap,
  }
  const mappedState = eventType ? eventStateMap[eventType] : state
  // protect from random or misspelled events
  if (!mappedState) {
  return res.status(400).json({
    success: false,
    message: 'Invalid or missing state/eventType',
  })
}

  const agentExists = agents.some((agent) => agent.id === agentId)

  if (!agentExists) {
    return res.status(404).json({
      success: false,
      message: 'Agent not found',
    })
  }

  const updatedAgent = updateAgent(agentId, mappedState, activity)

  res.json({
    success: true,
    agent: updatedAgent,
  })
})

app.post('/codex/open', (req, res) => {
  const thinkingAgent = updateAgent('codex', 'thinking', 'Opening Codex session')

  execFile('open', ['-a', 'Codex'], () => {})

  setTimeout(() => {
    updateAgent('codex', 'working', 'Codex session is open')
  }, 3000)

  res.json({
    success: true,
    agent: thinkingAgent,
  })
})

// listen for requests from Socket.IO
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
