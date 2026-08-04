import { SpreadsheetRaw } from "./2. AppsScriptRaw/SpreadsheetRaw";

export class Api {
  get ss(): SpreadsheetRaw {
    return SpreadsheetRaw.init();
  }
  handleSheetOnEditEvent(e: GoogleAppsScript.Events.SheetsOnEdit): void {
    if (e.value !== "TRUE") {
      return;
    }
    const standardizedEvent = this.ss.standardizeSheetEditEvent(e);
    // - Find out if it's an edit column
    // - Find out if it's in an aggregate api (sheet name)
    // - Find out if it's in the one-row API (sheet name + column name)
    // - Find out if it's in a separate column-wide one-row API (column name)

    top.onTrueValueEntered(e);
  }
}
