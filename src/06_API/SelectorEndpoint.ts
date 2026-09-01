import { ColumnNamedBase } from "../04_SpreadsheetNamed/ColumnNamedBase";
import type { SheetNamed } from "../04_SpreadsheetNamed/SheetNamed";
import { SpreadsheetNamed } from "../04_SpreadsheetNamed/SpreadsheetNamed";
import { FillRowIdsEndpoint } from "./FillRowIdsEndpoint";

export class OccupancyUpdateTermsSelect extends ColumnNamedBase<
  "occupancy",
  "updateTermsSelect"
> {
  static init() {
    return new FillRowIdsEndpoint({
      sheetName: "spreadsheetControls",
      ...FillRowIdsEndpoint.initSpreadsheetNamedProps(),
    });
  }
  get ss() {
    return new SpreadsheetNamed(this.spreadsheetNamedProps);
  }
  get sheet(): SheetNamed<"occupancy"> {
    return this.ss.sheet(this.sheetName);
  }
  fillMissingRowIds() {
    try {
      this.doBulkSelect();
      this._onRunSuccess();
    } catch (error) {
      this._onRunError(error);
    } finally {
      this._onRunEnd();
    }
  }
  doBulkSelect() {
    const selectAllCell = this.sheet
      .column("updateTermsSelect")
      .prepFetchUniformCell("action");
    const selectColumnData = this.sheet.column("updateTermsSelect").data;
    this.ss.fetchAllPrepped();

    selectColumnData;
  }
  private _onRunSuccess() {
    Logger.log("Succeeding.");
    this.sheet
      .column("fillRowIdsLastRanSucceeded")
      .data.topCell()
      .updateValue(true);
    this.sheet.column("fillRowIdsErrorMessage").data.topCell().updateValue("");
  }
  private _onRunError(error: unknown) {
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
  private _onRunEnd() {
    Logger.log("Closing out run.");
    this.sheet
      .column("fillRowIdsTimeLastRan")
      .data.topCell()
      .updateValue(Tim.nowTimestamp());
    this.ss.batchUpdateGSheets();
    Logger.log("Run ended.");
  }
}
