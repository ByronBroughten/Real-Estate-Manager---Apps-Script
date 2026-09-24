// Hook stdin/stdout plumbing shared by the guardrail hooks. See docs/claude-code-guardrails.md.
import { mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Every guardrail fails open: an unreadable input allows the call.
export function readHookInput() {
  try {
    const input = JSON.parse(readFileSync(0, "utf8"));
    return input && typeof input === "object" ? input : null;
  } catch {
    return null;
  }
}

export function writeHookOutput(output) {
  process.stdout.write(JSON.stringify(output));
}

export function sessionStatePath(sessionId, suffix) {
  const dir = join(tmpdir(), "claude-guardrails");
  mkdirSync(dir, { recursive: true });
  const safeId = String(sessionId ?? "unknown").replace(/[^\w-]/g, "_");
  return join(dir, `${safeId}.${suffix}`);
}

export async function runFailOpen(main) {
  try {
    await main();
  } catch {
    // A hook bug must never block unrelated work.
  }
  process.exit(0);
}
