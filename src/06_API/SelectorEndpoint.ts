import type { SpreadsheetNamedProps } from "../04_SpreadsheetNamed/ClassBases/SpreadsheetNamedBase";
import { ColumnNamedBase } from "../04_SpreadsheetNamed/ColumnNamedBase";
import type { SheetNamed } from "../04_SpreadsheetNamed/SheetNamed";
import { SpreadsheetNamed } from "../04_SpreadsheetNamed/SpreadsheetNamed";

export class OccupancyUpdateTermsSelect extends ColumnNamedBase<
  "occupancy",
  "updateTermsSelect"
> {
  static init(props: SpreadsheetNamedProps) {
    return new OccupancyUpdateTermsSelect({
      sheetName: "occupancy",
      columnName: "updateTermsSelect",
      ...props,
    });
  }
  get ss() {
    return new SpreadsheetNamed(this.spreadsheetNamedProps);
  }
  get sheet(): SheetNamed<"occupancy"> {
    return this.ss.sheet(this.sheetName);
  }
  execute(isSelected: boolean) {
    try {
      this.doBulkSelect(isSelected);
    } catch (error) {
      this._onRunError(error);
    }
  }
  doBulkSelect(isSelected: boolean) {
    this.sheet.indexed.ensureColumnIdsAreFetched();
    const selectDataColumn = this.sheet.column("updateTermsSelect").data;
    selectDataColumn.indexed.allCellsToValue(isSelected);
    this.ss.batchUpdateGSheets();
  }
  private _onRunError(error: unknown) {
    Logger.log("Error occurred: " + String(error));
  }
}
