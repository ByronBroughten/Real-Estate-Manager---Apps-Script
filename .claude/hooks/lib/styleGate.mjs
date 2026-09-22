// Decides the STYLE.md gate: a src/ TypeScript edit waits for a Read of STYLE.md this session. Pure; styleGate.mjs does the I/O.
import { relative, resolve, sep } from "node:path";

export const STYLE_GATE_REASON =
  "STYLE gate: Read STYLE.md (with the Read tool) before your first src/ edit this session, then retry. " +
  "The rules are one line each; skip docs/style/ unless a rule's line doesn't decide your case.";
const GENERATED_DIR = ["src", "01_SpreadsheetSchema", "generated"].join(sep);

export function editDecision({ projectDir, cwd, filePath, hasReadStyle }) {
  const target = projectRelative({ projectDir, cwd, filePath });
  const isGated =
    target.startsWith("src" + sep) && target.endsWith(".ts") && !target.startsWith(GENERATED_DIR + sep);
  return { denyReason: isGated && !hasReadStyle ? STYLE_GATE_REASON : null };
}

export function isStyleRead({ projectDir, cwd, filePath }) {
  return projectRelative({ projectDir, cwd, filePath }) === "STYLE.md";
}

function projectRelative({ projectDir, cwd, filePath }) {
  return relative(projectDir, resolve(cwd ?? projectDir, filePath));
}
