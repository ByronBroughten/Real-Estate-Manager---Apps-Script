// PreToolUse on Bash: denies Bash reads of columnConfigs.ts and whole-file dumps of large repo files.
import { BashReads } from "./lib/bashReads.mjs";
import { readHookInput, runFailOpen, writeHookOutput } from "./lib/hookIo.mjs";

await runFailOpen(() => {
  const input = readHookInput();
  const command = input?.tool_input?.command;
  if (input?.tool_name !== "Bash" || typeof command !== "string") return;
  const { denyReason } = BashReads.initFromHook(input).classify();
  if (!denyReason) return;
  writeHookOutput({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: denyReason,
    },
  });
});
