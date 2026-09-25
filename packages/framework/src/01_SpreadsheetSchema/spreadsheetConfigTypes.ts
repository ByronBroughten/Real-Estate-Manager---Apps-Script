import { type Configs, installedConfigs } from "./configRegister";
import { uniformRowLayout } from "./uniformRowLayout";

export type SpreadsheetConfig = Configs["spreadsheetConfig"];
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

export function ssConfigGet<TK extends keyof SpreadsheetConfig>(
  key: TK,
): LiveSpreadsheetConfig[TK] {
  return (liveSpreadsheetConfig ?? installedConfigs().spreadsheetConfig)[key];
}
