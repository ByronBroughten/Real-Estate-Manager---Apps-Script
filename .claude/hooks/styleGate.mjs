// PostToolUse on Read records a read of STYLE.md; PreToolUse on Edit and Write denies a src/ TypeScript edit until one is recorded.
import { existsSync, writeFileSync } from "node:fs";
import { editDecision, isStyleRead } from "./lib/styleGate.mjs";
import { readHookInput, runFailOpen, sessionStatePath, writeHookOutput } from "./lib/hookIo.mjs";

await runFailOpen(() => {
  const input = readHookInput();
  const filePath = input?.tool_input?.file_path;
  if (typeof filePath !== "string") return;
  const projectDir = process.env.CLAUDE_PROJECT_DIR ?? input.cwd ?? process.cwd();
  const where = { projectDir, cwd: input.cwd ?? projectDir, filePath };
  const markerPath = sessionStatePath(input.session_id, "style-read");
  if (input.hook_event_name === "PostToolUse") {
    if (input.tool_name === "Read" && isStyleRead(where)) writeFileSync(markerPath, "");
    return;
  }
  if (!["Edit", "Write"].includes(input.tool_name)) return;
  const { denyReason } = editDecision({ ...where, hasReadStyle: existsSync(markerPath) });
  if (!denyReason) return;
  writeHookOutput({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: denyReason,
    },
  });
});
