// Decides the style gate: an edit to a file ESLint lints waits for a full Read of config/docs/style.md this session. Pure; styleGate.ts does the I/O.
import { sep } from "node:path";

import { type FileLocation, isInLintSet, projectRelative } from "./lintSet.ts";

export const styleGateReason =
  "Read config/docs/style.md before your first code edit this session, then retry. " +
  "Use a full Read with no offset or limit (a partial Read or a Bash read isn't recorded), and skip config/docs/style/ unless a rule's line doesn't decide your case. Framework or app code also follows packages/framework/docs/style.md.";
export const stylePath = ["config", "docs", "style.md"].join(sep);
export const frameworkStylePath = ["packages", "framework", "docs", "style.md"].join(sep);
const frameworkOrAppRoots = ["framework", "real-estate"].map((packageName) => ["packages", packageName].join(sep) + sep);

// Cursor spells the event postToolUse; Claude Code spells it PostToolUse.
export function isPostToolUse(eventName: string | undefined): boolean {
  return eventName?.toLowerCase() === "posttooluse";
}

interface EditTarget extends FileLocation {
  hasReadStyle: boolean;
  generatedDirs: string[];
}

interface CursorEditTarget extends FileLocation {
  generatedDirs: string[];
  reads: RecordedStyleReads;
}

export interface EditDecision {
  denyReason: string | undefined;
}

interface StyleRead extends FileLocation {
  offset?: number;
  limit?: number;
  totalLines: number | undefined;
}

export function editDecision({ hasReadStyle, ...target }: EditTarget): EditDecision {
  return { denyReason: isInLintSet(target) && !hasReadStyle ? styleGateReason : undefined };
}

export interface RecordedStyleReads {
  hasReadGeneral: boolean;
  hasReadFramework: boolean;
}

const fullReadClause =
  "Use a full Read with no offset or limit (a partial Read isn't recorded), and skip the docs/style/ reasoning files unless a rule's line doesn't decide your case.";

export function needsFrameworkStyle(relativePath: string): boolean {
  return frameworkOrAppRoots.some((root) => relativePath.startsWith(root));
}

export function cursorEditDecision({ reads, ...target }: CursorEditTarget): EditDecision {
  if (!isInLintSet(target)) return { denyReason: undefined };
  const missing = missingStyleDocs(projectRelative(target), reads);
  if (missing.length === 0) return { denyReason: undefined };
  return { denyReason: `Read ${missing.join(" and ")} before this code edit, then retry. ${fullReadClause}` };
}

function missingStyleDocs(relativePath: string, reads: RecordedStyleReads): string[] {
  const missing: string[] = [];
  if (!reads.hasReadGeneral) missing.push(stylePath);
  if (needsFrameworkStyle(relativePath) && !reads.hasReadFramework) missing.push(frameworkStylePath);
  return missing;
}

export function isStyleRead(read: StyleRead): boolean {
  return isFullDocRead(read, stylePath);
}

export function isFullDocRead(
  { projectDir, cwd, filePath, offset, limit, totalLines }: StyleRead,
  docPath: string,
): boolean {
  if (projectRelative({ projectDir, cwd, filePath }) !== docPath) return false;
  if (offset == null && limit == null) return true;
  if ((offset ?? 1) > 1) return false;
  return limit == null || (totalLines !== undefined && Number.isInteger(totalLines) && limit >= totalLines);
}

export function cursorFilePath(toolInput: { path?: unknown; file_path?: unknown } | undefined): string | undefined {
  const filePath = toolInput?.file_path ?? toolInput?.path;
  return typeof filePath === "string" ? filePath : undefined;
}

export function cursorReadBounds(toolInput: { offset?: unknown; limit?: unknown } | undefined): {
  offset?: number;
  limit?: number;
} {
  const bounds: { offset?: number; limit?: number } = {};
  const offset = wholeNumber(toolInput?.offset);
  const limit = wholeNumber(toolInput?.limit);
  if (offset !== undefined) bounds.offset = offset;
  if (limit !== undefined) bounds.limit = limit;
  return bounds;
}

function wholeNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) ? value : undefined;
}
