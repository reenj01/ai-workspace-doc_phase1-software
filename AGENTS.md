# Agent Status Reporting

When working in this repository, Codex must report its visible status to the local AI Workspace Dock backend at the start of work, before tool use, when blocked, when waiting for approval, and when finished.

Use these commands from the project root:

```bash
node server/sendCodexEvent.js codex_thinking "Codex is thinking through the task"
node server/sendCodexEvent.js codex_working "Codex is working on project files"
node server/sendCodexEvent.js codex_tool_use "Codex is running a tool"
node server/sendCodexEvent.js codex_needs_approval "Codex needs approval"
node server/sendCodexEvent.js codex_blocked "Codex is blocked"
node server/sendCodexEvent.js codex_finished "Codex finished the current task"
node server/sendCodexEvent.js codex_resting "Codex is online but not doing anything"
```

Use the closest matching state:

- `codex_thinking`: send this at the beginning of every user request, before planning or reasoning through the task.
- `codex_working`: send this before editing, reviewing, or implementing project files.
- `codex_tool_use`: send this before running shell commands, builds, tests, searches, file reads, or other tools.
- `codex_needs_approval`: send this before asking for user permission or approval.
- `codex_blocked`: send this when unable to continue without user input, missing context, a missing dependency, or an external state change.
- `codex_finished`: send this when the current task is complete.
- `codex_resting`: send this when Codex is online but not actively working.

For normal work, report states in this order when applicable:

```text
codex_thinking
codex_tool_use
codex_working
codex_needs_approval or codex_blocked if needed
codex_finished
```

If the task does not require tools or file edits, still send `codex_thinking` at the start and `codex_finished` at the end.

Do not let status reporting interrupt the main task. The sender script exits quietly if the backend is not running.
