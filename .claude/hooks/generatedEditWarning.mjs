// PreToolUse on Edit and Write: warns, without blocking, before a hand edit inside the generated folder.
import { relative, resolve, sep } from "node:path";
import { readHookInput, runFailOpen, writeHookOutput } from "./lib/hookIo.mjs";

const generatedDir = ["src", "01_SpreadsheetSchema", "generated"].join(sep);

await runFailOpen(() => {
  const input = readHookInput();
  const filePath = input?.tool_input?.file_path;
  if (!["Edit", "Write"].includes(input?.tool_name) || typeof filePath !== "string") return;
  const projectDir = process.env.CLAUDE_PROJECT_DIR ?? input.cwd ?? process.cwd();
  const target = relative(projectDir, resolve(input.cwd ?? projectDir, filePath));
  if (!target.startsWith(generatedDir + sep)) return;
  writeHookOutput({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      additionalContext:
        `Generated-data warning: ${target} is generated. Fix the sheet and run \`npm run gen:configs\` instead of ` +
        "hand-editing it. The one exception is a config-sheet floor entry: docs/generated-data.md.",
    },
  });
});
