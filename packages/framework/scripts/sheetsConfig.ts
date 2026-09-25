// Finds a package's sheets.config.json by walking up from cwd, the only source of its spreadsheet ID. See docs/how-it-runs.md, "The sheets-framework bin".
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const sheetsConfigFile = "sheets.config.json";
const siblingScan = {
  depth: 3,
  skippedDirs: new Set(["node_modules", "dist", "coverage"]),
} as const;

// A package's sheets.config.json, its folders resolved to absolute paths.
export interface SheetsConfig {
  path: string;
  dir: string;
  spreadsheetId: string;
  generatedDir: string;
  choreHomes: string[];
}

export function loadSheetsConfig(cwd = process.cwd()): SheetsConfig {
  const path = nearestConfigPath(resolve(cwd));
  const config = readSheetsConfig(path);
  assertDistinctIds([
    path,
    ...siblingConfigPaths(path).filter((other) => other !== path),
  ]);
  return config;
}

function nearestConfigPath(cwd: string): string {
  for (let dir = cwd; ; dir = dirname(dir)) {
    const path = join(dir, sheetsConfigFile);
    if (existsSync(path)) return path;
    if (dirname(dir) === dir) {
      throw new Error(
        `No ${sheetsConfigFile} in ${cwd} or any folder above it. Run the bin from inside a package.`,
      );
    }
  }
}

function readSheetsConfig(path: string): SheetsConfig {
  const raw = JSON.parse(readFileSync(path, "utf8"));
  const dir = dirname(path);
  for (const field of ["spreadsheetId", "generatedDir"]) {
    if (!isFilledString(raw[field])) {
      throw new Error(`${path} has no "${field}" string.`);
    }
  }
  if (!Array.isArray(raw.choreHomes) || !raw.choreHomes.every(isFilledString)) {
    throw new Error(`${path} has no "choreHomes" array of folder strings.`);
  }
  return {
    path,
    dir,
    spreadsheetId: raw.spreadsheetId,
    generatedDir: join(dir, raw.generatedDir),
    choreHomes: raw.choreHomes.map((home: string) => join(dir, home)),
  };
}

// Every package config in the repo holding this one, so a copy-pasted ID is caught from either side.
function siblingConfigPaths(configPath: string): string[] {
  const root = repoRootOf(dirname(configPath));
  const found: string[] = [];
  function visit(dir: string, depth: number): void {
    const path = join(dir, sheetsConfigFile);
    if (existsSync(path)) found.push(path);
    if (depth === siblingScan.depth) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (
        !entry.isDirectory() ||
        entry.name.startsWith(".") ||
        siblingScan.skippedDirs.has(entry.name)
      ) {
        continue;
      }
      visit(join(dir, entry.name), depth + 1);
    }
  }
  visit(root, 0);
  return found;
}

function repoRootOf(start: string): string {
  for (let dir = start; ; dir = dirname(dir)) {
    if (existsSync(join(dir, ".git"))) return dir;
    if (dirname(dir) === dir) return start;
  }
}

function assertDistinctIds(paths: string[]): void {
  const byId = new Map<string, string>();
  for (const path of paths) {
    const { spreadsheetId } = JSON.parse(readFileSync(path, "utf8"));
    const other = byId.get(spreadsheetId);
    if (other) {
      throw new Error(
        `${other} and ${path} share a spreadsheet ID. Fix one before running anything.`,
      );
    }
    byId.set(spreadsheetId, path);
  }
}

function isFilledString(value: unknown): value is string {
  return typeof value === "string" && value !== "";
}
