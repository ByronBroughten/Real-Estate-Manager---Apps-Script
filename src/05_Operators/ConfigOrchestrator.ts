import { SpreadsheetNamedBase } from "../04_SpreadsheetNamed/ClassBases/SpreadsheetNamedBase";
import { SpreadsheetNamed } from "../04_SpreadsheetNamed/SpreadsheetNamed";
import { ColumnConfigOperator } from "./ColumnConfigOperator";
import { SheetConfigOperator } from "./SheetConfigOperator";
import { ValueConfigOperator } from "./ValueConfigOperator";

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
  get valueConfigOperator() {
    return new ValueConfigOperator(this.spreadsheetNamedProps);
  }
  syncAndFlushConfigSheets() {
    this.ss.fetchAllSheetProperties();
    this.sheetConfigOperator.prepFetchForSync();
    this.columnConfigOperator.prepFetchWithSheetConfig();
    this.ss.fetchAllPrepped({ skipFetchingProperties: true });
    this.sheetConfigOperator.syncToSpreadsheet();

    this.columnConfigOperator.fetchAfterSheetConfigSynced();
    this.columnConfigOperator.syncToSpreadsheet();

    this.ss.batchUpdateGSheets();
  }
  generateConfigFiles(): string {
    this.syncAndFlushConfigSheets();
    this.valueConfigOperator.fetchAfterColumnConfigSynced();
    return JSON.stringify({
      sheetConfigs: this.sheetConfigOperator.toFileSource(),
      columnConfigs: this.columnConfigOperator.toFileSource(),
      valueConfigs: this.valueConfigOperator.toFileSource(),
    });
  }
}
