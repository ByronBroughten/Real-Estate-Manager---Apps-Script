import { SheetNamedBase } from "../04_SpreadsheetNamed/ClassBases/SheetNamedBase";
import type { SpreadsheetNamedProps } from "../04_SpreadsheetNamed/ClassBases/SpreadsheetNamedBase";
import type { SheetNamed } from "../04_SpreadsheetNamed/SheetNamed";
import { SpreadsheetNamed } from "../04_SpreadsheetNamed/SpreadsheetNamed";
import { Tim } from "../utils/Tim";

export class FillRowIdsEndpoint extends SheetNamedBase<"spreadsheetControls"> {
  static init(props: SpreadsheetNamedProps) {
    return new FillRowIdsEndpoint({
      sheetName: "spreadsheetControls",
      ...props,
    });
  }
  get ss() {
    return new SpreadsheetNamed(this.spreadsheetNamedProps);
  }
  get sheet(): SheetNamed<"spreadsheetControls"> {
    return this.ss.sheet(this.sheetName);
  }
  execute() {
    try {
      this.onRunSetup();
      this.ss.fillMissingRowIds();
      this.onRunSuccess();
    } catch (error) {
      this.onRunError(error);
    } finally {
      this.onRunEnd();
    }
  }
  onRunSetup() {
    Logger.log("Setting up.");
    this.sheet.uniformRow("columnId").prepFetchFull();
    this.ss.fetchAllPrepped();
    this.sheet.column("fillRowIdsTimeLastRan").actionRowToDefault();
    this.sheet
      .column("fillRowIdsTimeLastRan")
      .data.topCell()
      .updateValue("Processing...");
    this.sheet.column("fillRowIdsErrorMessage").data.topCell().updateValue("");
    this.ss.batchUpdateGSheets();
  }
  onRunSuccess() {
    Logger.log("Succeeding.");
    this.sheet
      .column("fillRowIdsLastRanSucceeded")
      .data.topCell()
      .updateValue(true);
    this.sheet.column("fillRowIdsErrorMessage").data.topCell().updateValue("");
  }
  onRunError(error: unknown) {
    Logger.log("Error occurred.");
    this.ss.discardQueuedChanges();
    this.sheet
      .column("fillRowIdsLastRanSucceeded")
      .data.topCell()
      .updateValue(false);
    this.sheet
      .column("fillRowIdsErrorMessage")
      .data.topCell()
      .updateValue(String(error));
  }
  onRunEnd() {
    Logger.log("Closing out run.");
    this.sheet
      .column("fillRowIdsTimeLastRan")
      .data.topCell()
      .updateValue(Tim.nowTimestamp());
    this.ss.batchUpdateGSheets();
    Logger.log("Run ended.");
  }
}
