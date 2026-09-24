// PreToolUse on Bash and gsheets writes: a dev write asks while a pinning file is dirty; a gsheets write is allowed only on the clean dev ID.
import { spawnSync } from "node:child_process";
import { PINNING_FILES, bashDecision, gsheetsWriteDecision } from "./lib/pinnedTargets.mjs";
import { readSheetsConfigs } from "./lib/sheetsConfigs.mjs";
import { readHookInput, runFailOpen, writeHookOutput } from "./lib/hookIo.mjs";

await runFailOpen(() => {
  const input = readHookInput();
  if (!input) return;
  const projectDir = process.env.CLAUDE_PROJECT_DIR ?? input.cwd ?? process.cwd();
  let decision;
  if (input.tool_name === "Bash") {
    const command = input.tool_input?.command;
    if (typeof command !== "string") return;
    decision = bashDecision({ command, dirtyPinningFiles: dirtyPinningFiles(projectDir) });
  } else {
    decision = gsheetsWriteDecision({
      toolName: input.tool_name,
      spreadsheetId: input.tool_input?.spreadsheet_id,
      devSpreadsheetId: devSpreadsheetId(projectDir),
      dirtyPinningFiles: dirtyPinningFiles(projectDir),
    });
  }
  if (!decision) return;
  writeHookOutput({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: decision.permissionDecision,
      permissionDecisionReason: decision.reason,
    },
  });
});

function dirtyPinningFiles(projectDir) {
  const { status, stdout } = spawnSync("git", ["status", "--porcelain", "--", ...PINNING_FILES], {
    cwd: projectDir,
    encoding: "utf8",
  });
  if (status !== 0) return null;
  return stdout
    .split("\n")
    .filter(Boolean)
    .map((line) => line.slice(3));
}

function devSpreadsheetId(projectDir) {
  return readSheetsConfigs(projectDir).find(({ scriptPrefix }) => scriptPrefix === "dev")?.spreadsheetId;
}
