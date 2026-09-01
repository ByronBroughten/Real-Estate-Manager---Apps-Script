import { SheetNamedBase } from "../04_SpreadsheetNamed/ClassBases/SheetNamedBase";
import type { SheetNamed } from "../04_SpreadsheetNamed/SheetNamed";
import { SpreadsheetNamed } from "../04_SpreadsheetNamed/SpreadsheetNamed";
import { ConfigOrchestrator } from "../05_Operators/ConfigOrchestrator";
import { Tim } from "../utils/Tim";

export class SyncConfigSheetRowsEndpoint extends SheetNamedBase<"spreadsheetControls"> {
  static init() {
    return new SyncConfigSheetRowsEndpoint({
      sheetName: "spreadsheetControls",
      ...SyncConfigSheetRowsEndpoint.initSpreadsheetNamedProps(),
    });
  }
  get ss() {
    return new SpreadsheetNamed(this.spreadsheetNamedProps);
  }
  get sheet(): SheetNamed<"spreadsheetControls"> {
    return this.ss.sheet(this.sheetName);
  }
  get configOrchestrator() {
    return new ConfigOrchestrator(this.spreadsheetNamedProps);
  }
  syncConfigSheetRows() {
    try {
      this.onRunSetup();
      this.configOrchestrator.syncConfigSheetRows();
      this.onRunSuccess();
    } catch (error) {
      this.onRunError(error);
    } finally {
      this.onRunEnd();
    }
  }
  onRunSetup() {
    this.sheet.uniformRow("columnId").prepFetchFull();
    this.ss.fetchAllPrepped();
    this.sheet.column("syncConfigSheetRowsTimeLastRan").actionRowToDefault();
    this.sheet
      .column("syncConfigSheetRowsTimeLastRan")
      .data.topCell()
      .updateValue("Processing...");
    this.sheet
      .column("syncConfigSheetRowsErrorMessage")
      .data.topCell()
      .updateValue("");
    this.ss.batchUpdateGSheets();
  }
  onRunSuccess() {
    this.sheet
      .column("syncConfigSheetRowsLastRanSucceeded")
      .data.topCell()
      .updateValue(true);
    this.sheet
      .column("syncConfigSheetRowsErrorMessage")
      .data.topCell()
      .updateValue("");
  }
  onRunError(error: unknown) {
    this.ss.discardQueuedChanges();
    this.sheet
      .column("syncConfigSheetRowsLastRanSucceeded")
      .data.topCell()
      .updateValue(false);
    this.sheet
      .column("syncConfigSheetRowsErrorMessage")
      .data.topCell()
      .updateValue(String(error));
  }
  onRunEnd() {
    this.sheet
      .column("syncConfigSheetRowsTimeLastRan")
      .data.topCell()
      .updateValue(Tim.nowTimestamp());
    this.ss.batchUpdateGSheets();
  }
}
