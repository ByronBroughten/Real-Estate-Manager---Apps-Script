// Nudges a write-up at 15 reads per turn, then every 10; UserPromptSubmit resets the count.
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { BashReads } from "./lib/bashReads.mjs";
import { readHookInput, runFailOpen, sessionStatePath, writeHookOutput } from "./lib/hookIo.mjs";

const FIRST_NUDGE = 15;
const NUDGE_EVERY = 10;
const READ_TOOLS = new Set(["Read", "Grep", "Glob"]);
const EXEMPT_AGENT_TYPES = new Set(["repo-explorer"]);

class ReadCount {
  constructor({ input }) {
    this.input = input;
    this.logPath = sessionStatePath(input.session_id, "reads");
  }
  static init(input) {
    return new ReadCount({ input });
  }
  run() {
    if (this.input.hook_event_name === "UserPromptSubmit") {
      writeFileSync(this.logPath, "");
      return;
    }
    if (EXEMPT_AGENT_TYPES.has(this.input.agent_type) || !this._isRead()) return;
    // One appended line per read keeps parallel tool calls from losing counts.
    appendFileSync(this.logPath, `${this._counterKey()}\n`);
    const count = this._count();
    if (count < FIRST_NUDGE || (count - FIRST_NUDGE) % NUDGE_EVERY !== 0) return;
    writeHookOutput({
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext:
          `Read-count nudge: that is ${count} reads this turn. Before reading more, write down ` +
          "what you have found so far with file:line. If the answer is already visible, stop reading and act on it; " +
          "if a sweep remains, hand it to the repo-explorer agent.",
      },
    });
  }
  _isRead() {
    const { tool_name: toolName, tool_input: toolInput } = this.input;
    if (READ_TOOLS.has(toolName)) return true;
    if (toolName !== "Bash" || typeof toolInput?.command !== "string") return false;
    try {
      return BashReads.initFromHook(this.input).classify().isRead;
    } catch {
      return false;
    }
  }
  // A subagent counts on its own line, so its sweep never inflates the parent's turn.
  _counterKey() {
    return this.input.agent_id ? `agent:${this.input.agent_id}` : "main";
  }
  _count() {
    const key = this._counterKey();
    let log = "";
    try {
      log = readFileSync(this.logPath, "utf8");
    } catch {
      return 0;
    }
    return log.split("\n").filter((line) => line === key).length;
  }
}

await runFailOpen(() => {
  const input = readHookInput();
  if (input) ReadCount.init(input).run();
});
