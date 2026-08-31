import { SheetNamedBase } from "../04_SpreadsheetNamed/ClassBases/SheetNamedBase";
import type { SheetNamed } from "../04_SpreadsheetNamed/SheetNamed";
import { SpreadsheetNamed } from "../04_SpreadsheetNamed/SpreadsheetNamed";
import { Tim } from "../utils/Tim";

export class FillRowIdsEndpoint extends SheetNamedBase<"spreadsheetControls"> {
  static init() {
    return new FillRowIdsEndpoint({
      sheetName: "spreadsheetControls",
      ...FillRowIdsEndpoint.initSpreadsheetNamedProps(),
    });
  }
  get ss() {
    return new SpreadsheetNamed(this.spreadsheetNamedProps);
  }
  get sheet(): SheetNamed<"spreadsheetControls"> {
    return this.ss.sheet(this.sheetName);
  }
  fillMissingRowIds() {
    this.onRunSetup();
    try {
      this.ss.fillMissingRowIds();
      this.onRunSuccess();
    } catch (error) {
      this.onRunError(error);
    } finally {
      this.onRunEnd();
    }
  }
  onRunSetup() {
    this.sheet.column("fillRowIdsTimeLastRan").actionRowToDefault();
    this.sheet
      .column("fillRowIdsTimeLastRan")
      .data.topCell()
      .updateValue("Processing...");
    this.sheet.column("fillRowIdsErrorMessage").data.topCell().updateValue("");
    this.ss.batchUpdateGSheets();
  }
  onRunSuccess() {
    this.sheet
      .column("fillRowIdsLastRanSucceeded")
      .data.topCell()
      .updateValue(true);
    this.sheet.column("fillRowIdsErrorMessage").data.topCell().updateValue("");
  }
  onRunError(error: unknown) {
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
    this.sheet
      .column("fillRowIdsTimeLastRan")
      .data.topCell()
      .updateValue(Tim.nowTimestamp());
    this.ss.batchUpdateGSheets();
  }
}
