import type { SpreadsheetNamed } from "../04_SpreadsheetNamed/SpreadsheetNamed";

// Run from the terminal, as an endpoint is run from the sheet. See README, "Chores".
export interface Chore {
  description: string;
  action: (ss: SpreadsheetNamed) => string | void;
}
