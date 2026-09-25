// Decides the style gate: an edit to a file ESLint lints waits for a full Read of docs/style.md this session. Pure; styleGate.ts does the I/O.
import { sep } from "node:path";

import { type FileLocation, isInLintSet, projectRelative } from "./lintSet.ts";

export const styleGateReason =
  "Read docs/style.md before your first code edit this session, then retry. " +
  "Use a full Read with no offset or limit (a partial Read or a Bash read isn't recorded), and skip docs/style/ unless a rule's line doesn't decide your case.";
export const stylePath = ["docs", "style.md"].join(sep);

interface EditTarget extends FileLocation {
  hasReadStyle: boolean;
  generatedDirs: string[];
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

export function isStyleRead({
  projectDir,
  cwd,
  filePath,
  offset,
  limit,
  totalLines,
}: StyleRead): boolean {
  if (projectRelative({ projectDir, cwd, filePath }) !== stylePath) return false;
  if (offset == null && limit == null) return true;
  if ((offset ?? 1) > 1) return false;
  return limit == null || (totalLines !== undefined && Number.isInteger(totalLines) && limit >= totalLines);
}
