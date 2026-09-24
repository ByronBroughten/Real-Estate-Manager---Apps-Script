// Decides the style gate: a src/ TypeScript edit waits for a full Read of docs/style.md this session. Pure; styleGate.mjs does the I/O.
import { relative, resolve, sep } from "node:path";

export const STYLE_GATE_REASON =
  "Read docs/style.md before your first src/ edit this session, then retry. " +
  "Use a full Read with no offset or limit (a partial Read or a Bash read isn't recorded), and skip docs/style/ unless a rule's line doesn't decide your case.";
export const STYLE_PATH = ["docs", "style.md"].join(sep);

// generatedDirs are project-relative, one per package's sheets.config.json.
export function editDecision({ projectDir, cwd, filePath, hasReadStyle, generatedDirs }) {
  const target = projectRelative({ projectDir, cwd, filePath });
  const isGenerated = generatedDirs.some((dir) => target.startsWith(dir + sep));
  const isGated = target.startsWith("src" + sep) && target.endsWith(".ts") && !isGenerated;
  return { denyReason: isGated && !hasReadStyle ? STYLE_GATE_REASON : null };
}

export function isStyleRead({ projectDir, cwd, filePath, offset, limit, totalLines }) {
  if (projectRelative({ projectDir, cwd, filePath }) !== STYLE_PATH) return false;
  if (offset == null && limit == null) return true;
  if ((offset ?? 1) > 1) return false;
  return limit == null || (Number.isInteger(totalLines) && limit >= totalLines);
}

function projectRelative({ projectDir, cwd, filePath }) {
  return relative(projectDir, resolve(cwd ?? projectDir, filePath));
}
