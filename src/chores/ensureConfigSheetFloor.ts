import { ConfigOrchestrator } from "../05_Operators/ConfigOrchestrator";
import type { Chore } from "./Chore";

export const ensureConfigSheetFloor: Chore = {
  description:
    "Puts one whole-sheet edit warning on Spreadsheet Config, Sheet Config and Column Config, replaces a drifted floor warning, and sets floor columns back to their seeded types.",
  action: (ss) => {
    const report = new ConfigOrchestrator(
      ss.spreadsheetNamedProps,
    ).ensureConfigSheetFloor();
    ss.batchUpdateGSheets();
    return report;
  },
};
