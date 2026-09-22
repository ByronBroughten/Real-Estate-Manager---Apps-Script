// Decides the STYLE.md gate: a src/ TypeScript edit waits for a full Read of STYLE.md this session. Pure; styleGate.mjs does the I/O.
import { relative, resolve, sep } from "node:path";

export const STYLE_GATE_REASON =
  "Read STYLE.md before your first src/ edit this session, then retry. " +
  "Use a full Read with no offset or limit (a partial Read or a Bash read isn't recorded), and skip docs/style/ unless a rule's line doesn't decide your case.";
const GENERATED_DIR = ["src", "01_SpreadsheetSchema", "generated"].join(sep);

export function editDecision({ projectDir, cwd, filePath, hasReadStyle }) {
  const target = projectRelative({ projectDir, cwd, filePath });
  const isGated =
    target.startsWith("src" + sep) && target.endsWith(".ts") && !target.startsWith(GENERATED_DIR + sep);
  return { denyReason: isGated && !hasReadStyle ? STYLE_GATE_REASON : null };
}

export function isStyleRead({ projectDir, cwd, filePath, offset, limit, totalLines }) {
  if (projectRelative({ projectDir, cwd, filePath }) !== "STYLE.md") return false;
  if (offset == null && limit == null) return true;
  if ((offset ?? 1) > 1) return false;
  return limit == null || (Number.isInteger(totalLines) && limit >= totalLines);
}

function projectRelative({ projectDir, cwd, filePath }) {
  return relative(projectDir, resolve(cwd ?? projectDir, filePath));
}
