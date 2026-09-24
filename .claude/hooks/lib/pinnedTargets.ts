// Decides the pinned-target guard: dev writes drop to ask while a pinning file is dirty, and gsheets writes are allowed only on the dev ID. Pure; pinnedTargetGuard.ts does the I/O.
import { commandWordsOf } from "./bashReads.ts";
import { sheetsConfigFiles } from "./sheetsConfigs.ts";

export const pinningFiles = [
  ...sheetsConfigFiles.map(({ path }) => path),
  ".claude/hooks/pinnedTargetGuard.ts",
  ".claude/hooks/lib/pinnedTargets.ts",
  ".claude/hooks/lib/sheetsConfigs.ts",
];
export const guardedGsheetsWrites = new Set([
  "mcp__gsheets__update_cells",
  "mcp__gsheets__batch_update_cells",
  "mcp__gsheets__create_sheet",
]);
const devWrites = new Set(["dev:gen:configs", "dev:build", "dev:push", "dev:run"]);
const runVerbs = new Set(["run", "run-script"]);

// null means git could not say which pinning files are dirty.
export type DirtyPinningFiles = string[] | null;

export interface Decision {
  permissionDecision: "allow" | "ask";
  reason: string;
}

interface NpmScript {
  name: string;
  args: string[];
}

export interface BashCommand {
  command: string;
  dirtyPinningFiles: DirtyPinningFiles;
}

export interface GsheetsWrite {
  toolName: string | undefined;
  spreadsheetId: string | undefined;
  devSpreadsheetId: string | undefined;
  dirtyPinningFiles: DirtyPinningFiles;
}

export function devWriteOf(command: string): string | null {
  let commands;
  try {
    commands = commandWordsOf(command);
  } catch {
    return /\bdev:/.test(command) ? "dev:*" : null;
  }
  for (const words of commands) {
    const script = npmScriptOf(words);
    if (!script) continue;
    if (devWrites.has(script.name)) return script.name;
    if (script.name === "dev:chore" && script.args.includes("--send")) return script.name;
  }
  return null;
}

export function bashDecision({ command, dirtyPinningFiles }: BashCommand): Decision | null {
  const write = devWriteOf(command);
  if (!write || isClean(dirtyPinningFiles)) return null;
  return {
    permissionDecision: "ask",
    reason: `Pinned-target guard: \`${write}\` writes to the dev target, and ${dirtyShown(dirtyPinningFiles)}, so its standing yes is off until that is committed or reverted.`,
  };
}

export function gsheetsWriteDecision({
  toolName,
  spreadsheetId,
  devSpreadsheetId,
  dirtyPinningFiles,
}: GsheetsWrite): Decision | null {
  if (toolName === undefined || !guardedGsheetsWrites.has(toolName)) return null;
  const isDev = devSpreadsheetId !== undefined && devSpreadsheetId !== "" && spreadsheetId === devSpreadsheetId;
  if (!isDev) {
    return {
      permissionDecision: "ask",
      reason:
        "Pinned-target guard: this gsheets write targets a spreadsheet that is not the dev spreadsheet in packages/framework/sheets.config.json. " +
        "It needs a yes that names the exact sheet, range and values.",
    };
  }
  if (!isClean(dirtyPinningFiles)) {
    return {
      permissionDecision: "ask",
      reason: `Pinned-target guard: this gsheets write targets the dev spreadsheet, but ${dirtyShown(dirtyPinningFiles)}.`,
    };
  }
  return { permissionDecision: "allow", reason: "Pinned-target guard: a write to the dev spreadsheet, from a clean pin." };
}

function npmScriptOf(words: string[]): NpmScript | null {
  if (words[0] !== "npm" && words[0] !== "npm.cmd") return null;
  const rest = words.slice(1).filter((word) => !/^-/.test(word) || word === "--" || word === "--send");
  if (!runVerbs.has(rest[0] ?? "") || !rest[1]) return null;
  return { name: rest[1], args: rest.slice(2) };
}

// null means git could not say, which counts as dirty.
function isClean(dirtyPinningFiles: DirtyPinningFiles): boolean {
  return Array.isArray(dirtyPinningFiles) && dirtyPinningFiles.length === 0;
}

function dirtyShown(dirtyPinningFiles: DirtyPinningFiles): string {
  if (!Array.isArray(dirtyPinningFiles)) return "the pinning files' git state could not be read";
  return `${dirtyPinningFiles.join(", ")} ${dirtyPinningFiles.length === 1 ? "has" : "have"} uncommitted changes`;
}
