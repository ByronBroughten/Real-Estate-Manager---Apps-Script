import { spreadsheetConfig } from "./generated/spreadsheetConfig";
import { uniformRowLayout } from "./uniformRowLayout";

export type SpreadsheetConfig = typeof spreadsheetConfig;
export type LiveSpreadsheetConfig = {
  -readonly [K in keyof SpreadsheetConfig]: SpreadsheetConfig[K] extends number
    ? number
    : string;
};

let liveSpreadsheetConfig: LiveSpreadsheetConfig | null = null;

export function overlaySpreadsheetConfig(
  spreadsheetConfigLive: LiveSpreadsheetConfig,
): void {
  uniformRowLayout.validate(spreadsheetConfigLive);
  liveSpreadsheetConfig = spreadsheetConfigLive;
}

export function clearSpreadsheetConfigOverlay(): void {
  liveSpreadsheetConfig = null;
}

export function ssConfigGet<K extends keyof SpreadsheetConfig>(
  key: K,
): LiveSpreadsheetConfig[K] {
  return (liveSpreadsheetConfig ?? spreadsheetConfig)[key];
}
