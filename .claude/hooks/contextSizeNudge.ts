// UserPromptSubmit: warns once when the session's context passes about 400k tokens, and once more past 1M.
import { closeSync, openSync, readFileSync, readSync, statSync, writeFileSync } from "node:fs";

import { type HookInput, readHookInput, runFailOpen, sessionStatePath, writeHookOutput } from "./lib/hookIo.ts";

const transcriptBytes = { perToken: 4, tail: 4 * 1024 * 1024 } as const;
const thresholds = [
  {
    tokens: 1_000_000,
    operator: "This session's context is past ~1M tokens. End it after a written handoff.",
    claude:
      "Context-size nudge: this session is past ~1M tokens. Finish the current step, write a handoff " +
      "(docs/agents/planning.md, Handoffs: conclusion, files and line ranges to open, hypotheses ruled out), and tell the operator " +
      "to start a fresh session from it. Do not start new investigation or implementation here.",
  },
  {
    tokens: 400_000,
    operator: "This session's context is past ~400k tokens. Consider writing the conclusion down and starting fresh.",
    claude:
      "Context-size nudge: this session is past ~400k tokens. Write down the conclusion so far with file:line. " +
      "If a diagnosis is finishing, write a handoff (docs/agents/planning.md, Handoffs) before implementing and recommend a fresh session.",
  },
];

class ContextSize {
  readonly input: HookInput;
  readonly firedPath: string;
  constructor({ input }: { input: HookInput }) {
    this.input = input;
    this.firedPath = sessionStatePath(input.session_id, "size.json");
  }
  static init(input: HookInput): ContextSize {
    return new ContextSize({ input });
  }
  run(): void {
    const tokens = this._estimateTokens();
    if (tokens === undefined) return;
    const fired = this._fired();
    const threshold = thresholds.find((each) => tokens >= each.tokens);
    if (!threshold || fired.includes(threshold.tokens)) return;
    // Crossing 1M first also retires the 400k warning; each fires at most once.
    const retired = thresholds.filter((each) => each.tokens <= threshold.tokens).map((each) => each.tokens);
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
  _fired(): number[] {
    try {
      const fired = JSON.parse(readFileSync(this.firedPath, "utf8"));
      return Array.isArray(fired) ? fired : [];
    } catch {
      return [];
    }
  }
  // Prefer the last main-thread usage figures; fall back to transcript bytes.
  _estimateTokens(): number | undefined {
    const path = this.input.transcript_path;
    if (typeof path !== "string") return undefined;
    const { size } = statSync(path);
    const usage = lastUsageIn(readTail(path, size));
    if (usage) return usage;
    return Math.round(size / transcriptBytes.perToken);
  }
}

function readTail(path: string, size: number): string {
  const length = Math.min(size, transcriptBytes.tail);
  const buffer = Buffer.alloc(length);
  const fd = openSync(path, "r");
  try {
    readSync(fd, buffer, 0, length, size - length);
  } finally {
    closeSync(fd);
  }
  return buffer.toString("utf8");
}

function lastUsageIn(text: string): number | undefined {
  for (const line of text.split("\n").reverse()) {
    if (!line.includes('"usage"')) continue;
    let entry;
    try {
      entry = JSON.parse(line);
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
  return undefined;
}

await runFailOpen(() => {
  const input = readHookInput();
  if (input) ContextSize.init(input).run();
});
