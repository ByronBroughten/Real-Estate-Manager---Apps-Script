// Every package's sheets.config.json, read for its generated folder and spreadsheet ID. The list becomes packages/* at the workspace move.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";

export const SHEETS_CONFIGS = [
  { path: "sheets.config.json", scriptPrefix: "app" },
  { path: join("dev", "sheets.config.json"), scriptPrefix: "dev" },
];

// Project-relative generatedDir per package; a config that can't be read is skipped.
export function readSheetsConfigs(projectDir) {
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
