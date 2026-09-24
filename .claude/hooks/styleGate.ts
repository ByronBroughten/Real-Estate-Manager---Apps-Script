// PostToolUse on Read records a full read of docs/style.md; PreToolUse on Edit and Write denies a gated code edit until one is recorded.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { STYLE_PATH, editDecision, isStyleRead } from "./lib/styleGate.ts";
import { readSheetsConfigs } from "./lib/sheetsConfigs.ts";
import { readHookInput, runFailOpen, sessionStatePath, writeHookOutput } from "./lib/hookIo.ts";

await runFailOpen(() => {
  const input = readHookInput();
  if (!input) return;
  const filePath = input.tool_input?.file_path;
  if (typeof filePath !== "string") return;
  const projectDir = process.env.CLAUDE_PROJECT_DIR ?? input.cwd ?? process.cwd();
  const where = { projectDir, cwd: input.cwd ?? projectDir, filePath };
  const markerPath = sessionStatePath(input.session_id, "style-read");
  if (input.hook_event_name === "PostToolUse") {
    if (input.tool_name !== "Read") return;
    const { offset, limit } = input.tool_input ?? {};
    if (isStyleRead({ ...where, offset, limit, totalLines: lineCount(join(projectDir, STYLE_PATH)) }))
      writeFileSync(markerPath, "");
    return;
  }
  if (!["Edit", "Write"].includes(input.tool_name ?? "")) return;
  const { denyReason } = editDecision({
    ...where,
    hasReadStyle: existsSync(markerPath),
    generatedDirs: readSheetsConfigs(projectDir).map(({ generatedDir }) => generatedDir),
  });
  if (!denyReason) return;
  writeHookOutput({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: denyReason,
    },
  });
});

function lineCount(path: string): number {
  return readFileSync(path, "utf8").replace(/\n$/, "").split("\n").length;
}
