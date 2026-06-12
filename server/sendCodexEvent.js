const [, , eventType, ...activityParts] = process.argv

const activity = activityParts.join(' ') || 'Codex state changed'

if (!eventType) {
  console.error('Missing eventType')
  process.exit(1)
}

try {
  const response = await fetch('http://192.168.4.127:3001/events', {
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
    process.exit(0)
  }

  process.exit(0)
} catch {
  process.exit(0)
}
