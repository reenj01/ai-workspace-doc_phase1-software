import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

let codexWasFrontmost = false
let workingTimer = null

async function getFrontmostApp() {
  const { stdout } = await execFileAsync('osascript', [
    '-e',
    'tell application "System Events" to get name of first application process whose frontmost is true',
  ])

  return stdout.trim()
}

async function sendCodexEvent(eventType, activity) {
  try {
    const response = await fetch('http://localhost:3001/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agentId: 'codex',
        eventType,
        activity,
      }),
    })

    if (!response.ok) {
      return
    }
  } catch {
    return
  }
}

function scheduleWorkingState() {
  if (workingTimer) {
    clearTimeout(workingTimer)
  }

  workingTimer = setTimeout(async () => {
    try {
      const frontmostApp = await getFrontmostApp()

      if (frontmostApp === 'Codex') {
        await sendCodexEvent('codex_working', 'Codex is active on desktop')
      }
    } catch {
      return
    }
  }, 3000)
}

async function checkCodexActivity() {
  try {
    const frontmostApp = await getFrontmostApp()
    const codexIsFrontmost = frontmostApp === 'Codex'

    if (codexIsFrontmost && !codexWasFrontmost) {
      await sendCodexEvent('codex_thinking', 'Codex is active on desktop')
      scheduleWorkingState()
    }

    if (!codexIsFrontmost && codexWasFrontmost && workingTimer) {
      clearTimeout(workingTimer)
      workingTimer = null
    }

    codexWasFrontmost = codexIsFrontmost
  } catch {
    return
  }
}

setInterval(checkCodexActivity, 1000)
await checkCodexActivity()
