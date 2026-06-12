import { spawn } from 'child_process'

const existingNotifyCommand =
  '/Users/ireenj/.codex/computer-use/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient'

const runExistingNotify = () =>
  new Promise((resolve) => {
    const child = spawn(existingNotifyCommand, ['turn-ended'], {
      stdio: 'ignore',
      detached: true,
    })

    child.on('error', resolve)
    child.on('close', resolve)
  })

const sendCodexFinished = async () => {
  try {
    const response = await fetch('http://192.168.4.127:3001/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agentId: 'codex',
        eventType: 'codex_finished',
        activity: 'Codex finished the current turn',
      }),
    })

    if (!response.ok) {
      process.exit(0)
    }
  } catch {
    process.exit(0)
  }
}

await Promise.all([runExistingNotify(), sendCodexFinished()])

process.exit(0)
