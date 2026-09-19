import { ConfigOrchestrator } from "../05_Operators/ConfigOrchestrator";
import type { Chore } from "./Chore";

export const ensureConfigSheetFloor: Chore = {
  description:
    "Puts an edit warning on every config-sheet floor cell, and replaces drifted floor warnings.",
  action: (ss) => {
    const report = new ConfigOrchestrator(
      ss.spreadsheetNamedProps,
    ).ensureConfigSheetFloor();
    ss.batchUpdateGSheets();
    return report;
  },
};
