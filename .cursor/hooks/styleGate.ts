// postToolUse on Read records a full read of a style doc; preToolUse on Write denies a gated code edit until the docs that file needs are recorded.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  readHookInput,
  sessionStatePath,
  writeHookOutput,
} from "../../.claude/hooks/lib/hookIo.ts";
import { readSheetsConfigs } from "../../.claude/hooks/lib/sheetsConfigs.ts";
import {
  cursorEditDecision,
  cursorFilePath,
  cursorReadBounds,
  frameworkStylePath,
  isFullDocRead,
  isPostToolUse,
  stylePath,
} from "../../.claude/hooks/lib/styleGate.ts";

const editTools = new Set(["Edit", "Write", "StrReplace"]);

try {
  const input = readHookInput();
  if (!input) process.exit(0);
  const filePath = cursorFilePath(input.tool_input);
  const projectDir =
    process.env.CLAUDE_PROJECT_DIR ??
    input.workspace_roots?.[0] ??
    input.cwd ??
    process.cwd();
  const sessionId = input.session_id ?? input.conversation_id;
  const generalMarker = sessionStatePath(sessionId, "style-read");
  const frameworkMarker = sessionStatePath(sessionId, "framework-style-read");
  if (isPostToolUse(input.hook_event_name)) {
    if (input.tool_name === "Read" && filePath !== undefined) {
      const where = { projectDir, cwd: input.cwd ?? projectDir, filePath };
      const bounds = cursorReadBounds(input.tool_input);
      function recordStyleRead(docPath: string, markerPath: string): void {
        const totalLines =
          bounds.limit == null
            ? undefined
            : lineCount(join(projectDir, docPath));
        if (isFullDocRead({ ...where, ...bounds, totalLines }, docPath)) {
          writeFileSync(markerPath, "");
        }
      }
      recordStyleRead(stylePath, generalMarker);
      recordStyleRead(frameworkStylePath, frameworkMarker);
    }
    process.exit(0);
  }
  if (!editTools.has(input.tool_name ?? "") || filePath === undefined) {
    process.exit(0);
  }
  const { denyReason } = cursorEditDecision({
    projectDir,
    cwd: input.cwd ?? projectDir,
    filePath,
    reads: {
      hasReadGeneral: existsSync(generalMarker),
      hasReadFramework: existsSync(frameworkMarker),
    },
    generatedDirs: readSheetsConfigs(projectDir).map(
      ({ generatedDir }) => generatedDir,
    ),
  });
  if (denyReason) {
    writeHookOutput({
      permission: "deny",
      user_message: denyReason,
      agent_message: denyReason,
    });
    process.exit(0);
  }
  writeHookOutput({ permission: "allow" });
} catch {
  process.exit(1);
}

function lineCount(path: string): number {
  return readFileSync(path, "utf8").replace(/\n$/, "").split("\n").length;
}
