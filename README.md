# AI Workspace Dock - Phase 1 Software

This is the Phase 1 software prototype for an AI Workspace Dock. Instead of switching between multiple windows, tabs, and apps on a single screen to check which agent needs attention, the display acts as an ambient status dock. Each agent is represented visually, making it easy to glance over and understand what is happening. Tapping or clicking an agent on the display opens the corresponding AI app or workspace on my desktop.

The current prototype tracks three agents:

- Codex: coding agent
- Claude: research/tool-use agent
- ChatGPT: ideas agent

The main goal of this phase is to make sure the software pipeline functions as intended:

```text
External agent event
-> backend receives event
-> backend broadcasts update
-> React frontend updates the visible agent state
```

## Current Features

- React/Vite frontend running at `http://localhost:5173/`
- Express backend running at `http://localhost:3001/`
- Socket.IO realtime updates from backend to frontend
- Three visible agents: Codex, Claude, and ChatGPT
- Open Codex Session button that opens or brings Codex Desktop forward
- Backend connected/disconnected status banner
- Claude state test buttons in the UI
- Backend event endpoint for external updates
- Claude event sender script
- Codex event sender script
- Quiet failure handling when the backend is not running
- `lastUpdate` timestamp display for agent state changes

## Agent States

The current UI supports these states:

```text
resting
working
reading
thinking
running_tool
needs_approval
blocked
finished
```

Each state maps to a visual style in `src/App.css`.

## Project Structure

```text
phase1-software/
  server/
    index.js              Backend server and realtime event broadcaster
    sendClaudeEvent.js    Helper script for sending Claude events
    sendCodexEvent.js     Helper script for sending Codex events
    sendCodexNotify.js    Wrapper for Codex turn-ended notifications
  src/
    App.tsx               Main React app and agent UI
    App.css               Layout and state styling
    main.tsx              React app entry point
    index.css             Global styling
  package.json            Scripts and dependencies
```

## Install Dependencies

Run this once after cloning the project:

```bash
npm install
```

## Run The Backend

Open one terminal and run:

```bash
npm run server
```

Expected output:

```text
Server running on http://localhost:3001
```

The backend provides:

```text
GET /agents
POST /events
POST /codex/open
```

## Run The Frontend

Open a second terminal and run:

```bash
npm run dev
```

Then open:

```text
http://localhost:5173/
```

## Test A Claude Event Manually

With the backend and frontend both running, send a manual Claude event:

```bash
node server/sendClaudeEvent.js claude_tool_use "Claude Code is running a tool"
```

Expected result:

```text
The Claude card changes to running_tool in the browser.
```

## Test A Codex Event Manually

With the backend and frontend both running, send a manual Codex event:

```bash
node server/sendCodexEvent.js codex_finished "Codex finished the current turn"
```

Expected result:

```text
The Codex card changes to finished in the browser, then returns to resting after 60 seconds.
```

## Open A Codex Session

The Codex control panel includes an `Open Codex Session` button.

When clicked, it calls:

```text
POST http://localhost:3001/codex/open
```

Expected behavior:

```text
Codex changes to thinking
Codex Desktop opens or comes to the front
after 3 seconds, Codex changes to working
when Codex turn-ended notify fires, Codex changes to finished
after 60 seconds, Codex returns to resting
```

This is a no-permission pseudo-hook. It does not read the screen or monitor the Codex UI. It uses the button click as the session-start signal and Codex's existing notify behavior as the session-finished signal.

## Backend Event Format

The backend accepts events at:

```text
POST http://localhost:3001/events
```

Example payload:

```json
{
  "agentId": "claude",
  "state": "blocked",
  "activity": "Blocked by missing information"
}
```

The backend also accepts Claude-specific event types:

```json
{
  "agentId": "claude",
  "eventType": "claude_tool_use",
  "activity": "Claude Code is running a tool"
}
```

Current Claude event mappings:

```text
claude_working -> working
claude_tool_use -> running_tool
claude_needs_approval -> needs_approval
claude_finished -> finished
```

Current Codex event mappings:

```text
codex_thinking -> thinking
codex_working -> working
codex_tool_use -> running_tool
codex_needs_approval -> needs_approval
codex_blocked -> blocked
codex_finished -> finished
codex_resting -> resting
```

## Claude Code Hook Setup

This repo includes the event sender script, but personal Claude Code hook settings should not be committed. For a global Claude Code setup, configure hooks in:

```text
~/.claude/settings.json
```

Use absolute paths for both Node and `server/sendClaudeEvent.js` so the hook works even when Claude Code runs from another project folder.

Example command shape:

```text
/absolute/path/to/node /absolute/path/to/phase1-software/server/sendClaudeEvent.js claude_tool_use "Claude Code is running a tool"
```

## Quiet Failure Handling

`server/sendClaudeEvent.js` exits successfully if the backend is off. This prevents global Claude Code hooks from interrupting normal Claude Code sessions when the AI workspace dock is not running.

Expected behavior:

```text
Backend on -> event updates the app
Backend off -> script exits quietly
```

## Push Safety Notes

Do not commit personal Claude Code settings:

```text
.claude/
```

Local Claude settings can contain machine-specific hook commands and paths. They are not needed for someone else to run the prototype.

## Next Steps

- Add a connected/disconnected backend status banner
- Add recent event history
- Improve the visual layout so it feels more like an ambient dock
- Add clearer icons or animations for important states
- Test at small-screen sizes such as `800x480` and `1024x600`
- Move to hardware only after the desktop prototype is reliable and readable
