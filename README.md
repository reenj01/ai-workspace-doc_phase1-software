# AI Workspace Dock - Phase 1 Software

This is the Phase 1 software prototype for an AI Workspace Dock: a small ambient display where AI agents appear as characters inside a room. Instead of checking multiple app windows to see whether an AI agent is done, thinking, blocked, or waiting, the display shows each agent's current state visually.

The current prototype is running on a Raspberry Pi 5 connected to a 5in touchscreen display. Claude Code and Codex run on the MacBook, then send state events over the local network to the backend running on the Raspberry Pi.

## Current Setup

```text
Claude Code / Codex on MacBook
-> sender script posts event to Raspberry Pi backend
-> Express backend receives event
-> Socket.IO broadcasts update
-> React frontend on Raspberry Pi display updates the agent
```

Current Raspberry Pi backend URL:

```text
http://192.168.4.127:3001
```

If the Raspberry Pi IP changes, update the sender scripts in `server/`.

## Current Agents

The visible room currently shows:

- Codex
- Claude

ChatGPT still exists in fallback/backend data, but it is not currently rendered in the room scene.

## Current Features

- React/Vite frontend
- Express backend
- Socket.IO realtime state updates
- Raspberry Pi 5 + 5in touchscreen display support
- SVG bedroom scene
- Codex and Claude SVG agent characters
- Thought bubble above each visible agent
- State icon inside each thought bubble
- Automatic random agent movement across the white floor area
- Drag and drop agents within the floor boundary
- Agent SVG shakes while dragged
- Active/non-resting agents come to the front
- Sprite animation plays when an agent receives a non-resting state update
- Sprite animation loops 4 times, then returns to the static SVG
- `finished` state returns to `resting` after 30 seconds
- Backend online/offline status label
- Bottom-left open/close update panel
- Update panel only logs `finished` events
- Update panel has Claude and Codex columns
- Update panel auto-scrolls to the newest finished update
- Quiet sender script failures when backend is offline

## Agent States

Supported states:

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

State icons live in:

```text
src/assets/states/
```

Agent assets live in:

```text
src/assets/agents/
src/assets/agents-sprite/
```

## Project Structure

```text
phase1-software/
  server/
    index.js              Express + Socket.IO backend
    sendClaudeEvent.js    Sends Claude Code events to backend
    sendCodexEvent.js     Sends manual Codex events to backend
    sendCodexNotify.js    Sends Codex finished events after Codex notify
  src/
    assets/
      agents/             Static agent SVGs
      agents-sprite/      7-frame sprite animations
      room/               Bedroom SVG
      states/             Thought bubble and state icons
    App.tsx               Main React app
    App.css               Scene layout, movement, drag, sprite styling
    main.tsx              React entry point
  package.json            Project scripts and dependencies
```

## Run On Raspberry Pi

Open one Raspberry Pi terminal for the backend:

```bash
cd ~/phase1-software
npm run server
```

Expected output:

```text
Server running on http://localhost:3001
```

Open a second Raspberry Pi terminal for the frontend:

```bash
cd ~/phase1-software
npm run dev -- --host 0.0.0.0
```

Open Chromium on the Raspberry Pi:

```text
http://localhost:5173
```

The app should appear on the 5in touchscreen and in Raspberry Pi screen share.

## Copy Project From Mac To Raspberry Pi

Use `rsync` instead of `scp` so `node_modules`, `dist`, and `.git` are not copied.

Run from the MacBook:

```bash
rsync -av --exclude node_modules --exclude dist --exclude .git /Users/ireenj/Desktop/workspace/0-coding-projects/ai-workspace-doc/phase1-software/ ireenj@192.168.4.127:~/phase1-software/
```

Then on the Raspberry Pi:

```bash
cd ~/phase1-software
npm install
```

## Mac Sender Scripts

Claude Code and Codex run on the MacBook, so the sender scripts on the MacBook need to send events to the Raspberry Pi backend.

Current sender script target:

```text
http://192.168.4.127:3001/events
```

Files using this URL:

```text
server/sendClaudeEvent.js
server/sendCodexEvent.js
server/sendCodexNotify.js
```

If the Raspberry Pi IP changes, update these three files on the MacBook.

## Manual Event Tests From Mac

With the Raspberry Pi backend and frontend running, test Claude from the Mac:

```bash
cd /Users/ireenj/Desktop/workspace/0-coding-projects/ai-workspace-doc/phase1-software
node server/sendClaudeEvent.js claude_thinking
```

Claude should change state on the Raspberry Pi display.

Test Claude finished:

```bash
node server/sendClaudeEvent.js claude_finished
```

Claude should show `finished`, and the update panel should log one finished timestamp.

Test Codex:

```bash
node server/sendCodexEvent.js codex_thinking
node server/sendCodexEvent.js codex_finished
```

Codex should update on the Raspberry Pi display. Only `codex_finished` should appear in the timestamp panel.

## Backend API

The backend runs on:

```text
http://localhost:3001
```

on whichever machine is running `server/index.js`.

Endpoints:

```text
GET /agents
POST /events
POST /codex/open
```

Example event payload:

```json
{
  "agentId": "claude",
  "eventType": "claude_finished",
  "activity": "Claude Code finished"
}
```

## Event Mappings

Claude event mappings:

```text
claude_resting -> resting
claude_thinking -> thinking
claude_working -> working
claude_tool_use -> running_tool
claude_needs_approval -> needs_approval
claude_blocked -> blocked
claude_finished -> finished
```

Codex event mappings:

```text
codex_thinking -> thinking
codex_working -> working
codex_tool_use -> running_tool
codex_needs_approval -> needs_approval
codex_blocked -> blocked
codex_finished -> finished
codex_resting -> resting
```

## Claude Code Hook Notes

Claude Code hooks are configured outside this repo, usually in:

```text
~/.claude/settings.json
```

Use absolute paths for:

- Node
- `server/sendClaudeEvent.js`

The sender script exits quietly if the backend is offline, so Claude Code sessions are not interrupted when the dock is not running.

## Codex Notify Notes

Codex finished detection uses `server/sendCodexNotify.js`. This wrapper runs the existing Codex desktop notification command and also sends:

```text
codex_finished
```

to the backend.

Codex notify is configured outside this repo in the local Codex config.

## Development Commands

Install dependencies:

```bash
npm install
```

Run backend:

```bash
npm run server
```

Run frontend:

```bash
npm run dev -- --host 0.0.0.0
```

Lint:

```bash
npm run lint
```

Build:

```bash
npm run build
```

## Git And Privacy Notes

Do not commit private local configuration files such as:

```text
.claude/
~/.claude/settings.json
~/.codex/config.toml
```

These can contain machine-specific absolute paths, local usernames, and hook configuration.

Also avoid committing:

```text
node_modules/
dist/
```

## Current Hardware Status

Working hardware/software loop:

```text
Raspberry Pi 5
5in touchscreen display
Raspberry Pi OS
React app open in Chromium at http://localhost:5173
Backend running on Raspberry Pi at http://localhost:3001
MacBook sender scripts posting to Raspberry Pi IP
```

The project is now past the basic desktop software test and is running as an early hardware display prototype.
