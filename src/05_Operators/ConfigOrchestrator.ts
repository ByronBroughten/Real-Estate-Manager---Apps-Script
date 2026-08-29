import { SpreadsheetNamedBase } from "../04_SpreadsheetNamed/ClassBases/SpreadsheetNamedBase";
import { SpreadsheetNamed } from "../04_SpreadsheetNamed/SpreadsheetNamed";
import { ColumnConfigOperator } from "./ColumnConfigOperator";
import { SheetConfigOperator } from "./SheetConfigOperator";

// Syncs the live Sheet Config sheet, then (now that it's current) the live
// Column Config sheet, sharing one ColumnConfigOperator's state so both
// sets of queued changes — plus any column IDs written to business sheets
// along the way — persist in a single flush. See CLAUDE.md/README for why
// these two must be synced and regenerated together.

export class ConfigOrchestrator extends SpreadsheetNamedBase {
  static init(): ConfigOrchestrator {
    return new ConfigOrchestrator(
      ConfigOrchestrator.initSpreadsheetNamedProps(),
    );
  }
  get ss(): SpreadsheetNamed {
    return new SpreadsheetNamed(this.spreadsheetNamedProps);
  }
  get columnConfigOperator() {
    return new ColumnConfigOperator(this.spreadsheetNamedProps);
  }
  get sheetConfigOperator() {
    return new SheetConfigOperator(this.spreadsheetNamedProps);
  }
  syncAndFlushConfigSheets() {
    this.sheetConfigOperator.fetchAndUpdateAll();
    this.columnConfigOperator.fetchAndUpdateColumnConfig();
    this.ss.batchUpdateGSheets();
  }
  generateConfigFiles(): string {
    this.syncAndFlushConfigSheets();
    return JSON.stringify({
      sheetConfigs: this.sheetConfigOperator.toFileSource(),
      columnConfigs: this.columnConfigOperator.toFileSource(),
    });
  }
}
