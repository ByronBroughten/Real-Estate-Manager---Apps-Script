// Every package's sheets.config.json, read for its generated folder and spreadsheet ID.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";

export interface SheetsConfigEntry {
  path: string;
  scriptPrefix: "app" | "dev";
  spreadsheetId: unknown;
  generatedDir: string;
}

export const SHEETS_CONFIGS: { path: string; scriptPrefix: "app" | "dev" }[] = [
  { path: join("packages", "real-estate", "sheets.config.json"), scriptPrefix: "app" },
  { path: join("packages", "framework", "sheets.config.json"), scriptPrefix: "dev" },
];

// Project-relative generatedDir per package; a config that can't be read is skipped.
export function readSheetsConfigs(projectDir: string): SheetsConfigEntry[] {
  return SHEETS_CONFIGS.flatMap(({ path, scriptPrefix }) => {
    let raw;
    try {
      raw = JSON.parse(readFileSync(join(projectDir, path), "utf8"));
    } catch {
      return [];
    }
    if (typeof raw?.generatedDir !== "string") return [];
    return [
      {
        path,
        scriptPrefix,
        spreadsheetId: raw.spreadsheetId,
        generatedDir: join(dirname(path), raw.generatedDir),
      },
    ];
  });
}
