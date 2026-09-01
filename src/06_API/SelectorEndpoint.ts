import { ColumnNamedBase } from "../04_SpreadsheetNamed/ColumnNamedBase";
import type { SheetNamed } from "../04_SpreadsheetNamed/SheetNamed";
import { SpreadsheetNamed } from "../04_SpreadsheetNamed/SpreadsheetNamed";

export class OccupancyUpdateTermsSelect extends ColumnNamedBase<
  "occupancy",
  "updateTermsSelect"
> {
  static init() {
    return new OccupancyUpdateTermsSelect({
      sheetName: "occupancy",
      columnName: "updateTermsSelect",
      ...OccupancyUpdateTermsSelect.initSpreadsheetNamedProps(),
    });
  }
  get ss() {
    return new SpreadsheetNamed(this.spreadsheetNamedProps);
  }
  get sheet(): SheetNamed<"occupancy"> {
    return this.ss.sheet(this.sheetName);
  }
  execute() {
    try {
      this.doBulkSelect();
    } catch (error) {
      this._onRunError(error);
    }
  }
  doBulkSelect() {
    const selectAllCell = this.sheet
      .column("updateTermsSelect")
      .prepFetchUniformCell("action");
    this.ss.fetchAllPrepped();
    const selectDataColumn = this.sheet.column("updateTermsSelect").data;
    selectDataColumn.indexed.allCellsToValue(selectAllCell.value());
    this.ss.batchUpdateGSheets();
  }
  private _onRunError(error: unknown) {
    Logger.log("Error occurred: " + String(error));
  }
}
