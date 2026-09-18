// UserPromptSubmit: warns once when the session's context passes about 400k tokens, and once more past 1M.
import { closeSync, openSync, readFileSync, readSync, statSync, writeFileSync } from "node:fs";
import { readHookInput, runFailOpen, sessionStatePath, writeHookOutput } from "./lib/hookIo.mjs";

const BYTES_PER_TOKEN = 4;
const TAIL_BYTES = 4 * 1024 * 1024;
const THRESHOLDS = [
  {
    tokens: 1_000_000,
    operator: "This session's context is past ~1M tokens. End it after a written handoff.",
    claude:
      "Context-size nudge: this session is past ~1M tokens. Finish the current step, write a handoff " +
      "(CLAUDE.md, Handoffs: conclusion, files and line ranges to open, hypotheses ruled out), and tell the operator " +
      "to start a fresh session from it. Do not start new investigation or implementation here.",
  },
  {
    tokens: 400_000,
    operator: "This session's context is past ~400k tokens. Consider writing the conclusion down and starting fresh.",
    claude:
      "Context-size nudge: this session is past ~400k tokens. Write down the conclusion so far with file:line. " +
      "If a diagnosis is finishing, write a handoff (CLAUDE.md, Handoffs) before implementing and recommend a fresh session.",
  },
];

class ContextSize {
  constructor({ input }) {
    this.input = input;
    this.firedPath = sessionStatePath(input.session_id, "size.json");
  }
  static init(input) {
    return new ContextSize({ input });
  }
  run() {
    const tokens = this._estimateTokens();
    if (tokens === null) return;
    const fired = this._fired();
    const threshold = THRESHOLDS.find((each) => tokens >= each.tokens);
    if (!threshold || fired.includes(threshold.tokens)) return;
    // Crossing 1M first also retires the 400k warning; each fires at most once.
    const retired = THRESHOLDS.filter((each) => each.tokens <= threshold.tokens).map((each) => each.tokens);
    writeFileSync(this.firedPath, JSON.stringify([...new Set([...fired, ...retired])]));
    const estimate = `${Math.round(tokens / 1000)}k`;
    writeHookOutput({
      systemMessage: `${threshold.operator} (estimate: ${estimate})`,
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext: `${threshold.claude} (estimate: ${estimate} tokens)`,
      },
    });
  }
  _fired() {
    try {
      const fired = JSON.parse(readFileSync(this.firedPath, "utf8"));
      return Array.isArray(fired) ? fired : [];
    } catch {
      return [];
    }
  }
  // Prefer the last main-thread usage figures; fall back to transcript bytes.
  _estimateTokens() {
    const path = this.input.transcript_path;
    if (typeof path !== "string") return null;
    const { size } = statSync(path);
    const usage = lastUsageIn(readTail(path, size));
    if (usage) return usage;
    return Math.round(size / BYTES_PER_TOKEN);
  }
}

function readTail(path, size) {
  const length = Math.min(size, TAIL_BYTES);
  const buffer = Buffer.alloc(length);
  const fd = openSync(path, "r");
  try {
    readSync(fd, buffer, 0, length, size - length);
  } finally {
    closeSync(fd);
  }
  return buffer.toString("utf8");
}

function lastUsageIn(text) {
  const lines = text.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    if (!lines[i].includes('"usage"')) continue;
    let entry;
    try {
      entry = JSON.parse(lines[i]);
    } catch {
      continue;
    }
    const usage = entry?.message?.usage;
    if (entry.isSidechain || !usage) continue;
    return (
      (usage.input_tokens ?? 0) +
      (usage.cache_creation_input_tokens ?? 0) +
      (usage.cache_read_input_tokens ?? 0) +
      (usage.output_tokens ?? 0)
    );
  }
  return null;
}

await runFailOpen(() => {
  const input = readHookInput();
  if (input) ContextSize.init(input).run();
});
