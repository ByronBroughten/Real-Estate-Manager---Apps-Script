import type { SpreadsheetNamed } from "../04_SpreadsheetNamed/SpreadsheetNamed";

// Run from the terminal, as an endpoint is run from the sheet. See docs/architecture/chores.md.
export interface Chore {
  description: string;
  action: (ss: SpreadsheetNamed) => string | void;
}
