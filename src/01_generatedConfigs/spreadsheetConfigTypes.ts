import { spreadsheetConfig } from "./spreadsheetConfig";

export type SpreadsheetConfig = typeof spreadsheetConfig;
export function ssConfigGet<K extends keyof SpreadsheetConfig>(
  key: K,
): SpreadsheetConfig[K] {
  return spreadsheetConfig[key];
}
