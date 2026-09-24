// Decides the style gate: an edit to a file ESLint lints waits for a full Read of docs/style.md this session. Pure; styleGate.ts does the I/O.
import { isAbsolute, join, relative, resolve, sep } from "node:path";

export const styleGateReason =
  "Read docs/style.md before your first code edit this session, then retry. " +
  "Use a full Read with no offset or limit (a partial Read or a Bash read isn't recorded), and skip docs/style/ unless a rule's line doesn't decide your case.";
export const stylePath = ["docs", "style.md"].join(sep);
const lintedFiles = {
  extensions: [".ts", ".js", ".mjs"],
  ignoredDirs: new Set(["node_modules", ".git", "dist", "coverage"]),
  ignoredRoot: join(".claude", "worktrees") + sep,
} as const;

// generatedDirs are project-relative, one per package's sheets.config.json.
export interface FileLocation {
  projectDir: string;
  cwd: string | undefined;
  filePath: string;
}

export function editDecision({
  projectDir,
  cwd,
  filePath,
  hasReadStyle,
  generatedDirs,
}: FileLocation & { hasReadStyle: boolean; generatedDirs: string[] }): { denyReason: string | null } {
  const target = projectRelative({ projectDir, cwd, filePath });
  const isGenerated = generatedDirs.some((dir) => target.startsWith(dir + sep));
  const isGated = isLinted(target) && !isGenerated;
  return { denyReason: isGated && !hasReadStyle ? styleGateReason : null };
}

export function isStyleRead({
  projectDir,
  cwd,
  filePath,
  offset,
  limit,
  totalLines,
}: FileLocation & { offset?: number; limit?: number; totalLines: number | undefined }): boolean {
  if (projectRelative({ projectDir, cwd, filePath }) !== stylePath) return false;
  if (offset == null && limit == null) return true;
  if ((offset ?? 1) > 1) return false;
  return limit == null || (totalLines !== undefined && Number.isInteger(totalLines) && limit >= totalLines);
}

// `eslint .` lints every code file in the project outside its ignored folders, at any depth.
function isLinted(target: string): boolean {
  if (!target || target.startsWith("..") || isAbsolute(target)) return false;
  if (target.split(sep).slice(0, -1).some((dir) => lintedFiles.ignoredDirs.has(dir))) return false;
  if (target.startsWith(lintedFiles.ignoredRoot)) return false;
  return lintedFiles.extensions.some((extension) => target.endsWith(extension));
}

function projectRelative({ projectDir, cwd, filePath }: FileLocation): string {
  return relative(projectDir, resolve(cwd ?? projectDir, filePath));
}
