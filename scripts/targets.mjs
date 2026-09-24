// Resolves `--target <name>` from the checked-in spreadsheetTargets.json. See docs/how-it-runs.md, "Targets: dev and app".
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const TARGETS_PATH = fileURLToPath(
  new URL("../spreadsheetTargets.json", import.meta.url),
);
const FIELDS = ["spreadsheetId", "generatedDir"];

function readTargetTable() {
  return JSON.parse(readFileSync(TARGETS_PATH, "utf8"));
}

export function takeTarget(argv, table = readTargetTable()) {
  const at = argv.indexOf("--target");
  if (at === -1) return { target: null, argv };
  const name = argv[at + 1];
  assertDistinctIds(table);
  const row = Object.hasOwn(table, name ?? "") ? table[name] : undefined;
  if (!row) {
    throw new Error(
      `--target ${name === undefined ? "needs a name" : `"${name}" is not in spreadsheetTargets.json`}. Targets: ${Object.keys(table).join(", ")}.`,
    );
  }
  for (const field of FIELDS) {
    if (typeof row[field] !== "string" || row[field] === "") {
      throw new Error(
        `spreadsheetTargets.json: "${name}" has no "${field}" string.`,
      );
    }
  }
  return {
    target: {
      spreadsheetId: row.spreadsheetId,
      generatedDir: row.generatedDir,
    },
    argv: [...argv.slice(0, at), ...argv.slice(at + 2)],
  };
}

// A copy-paste mistake here would merge the two targets, so it stops any targeted run.
function assertDistinctIds(table) {
  const byId = new Map();
  for (const [name, row] of Object.entries(table)) {
    const other = byId.get(row?.spreadsheetId);
    if (other) {
      throw new Error(
        `spreadsheetTargets.json: ${other} and ${name} share a spreadsheet ID. Fix the table before running anything.`,
      );
    }
    byId.set(row?.spreadsheetId, name);
  }
}
