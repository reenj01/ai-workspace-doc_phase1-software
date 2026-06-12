const [, , eventType, ...activityParts] = process.argv

const activity = activityParts.join(' ') || 'Claude Code state changed'

if (!eventType) {
  console.error('Missing eventType')
  process.exit(1)
}

try {
  const response = await fetch('http://192.168.4.127:3001/events', {
    method: 'POST', // tells backend this request is sending data
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      agentId: 'claude',
      eventType,
      activity,
    }),
  })

  // checks if backend returned an error
  // exit successfully even if backend returned an error
  // bc hook should not interrupt claude code
  // only display an error in localhost but don't actually stop claude from working
  if (!response.ok) {
    process.exit(0)
  }

  process.exit(0)
} catch {
  process.exit(0)
}
