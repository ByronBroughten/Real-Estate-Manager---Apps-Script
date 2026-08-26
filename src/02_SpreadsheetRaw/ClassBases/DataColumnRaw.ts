import type { CellValue, CellValueName } from "../../00_base/base";
import { SpreadsheetRaw } from "../SpreadsheetRaw";
import { ColumnCommonRaw } from "./ColumnCommonRaw";

export class DataColumnRaw<
  VN extends CellValueName = CellValueName,
> extends ColumnCommonRaw<VN> {
  get ss(): SpreadsheetRaw {
    return new SpreadsheetRaw(this.spreadsheetRawProps);
  }
  get valueArr(): CellValue<VN>[] {
    return this.sheet.data.rowIndexesActive.map((rowIndex) =>
      this.value(rowIndex),
    );
  }
  value(rowIndex: number): CellValue<VN> {
    return this.cell(rowIndex).value();
  }
  updateValue(rowIndex: number, newValue: CellValue<VN>): this {
    this.cell(rowIndex).updateValue(newValue);
    return this;
  }
  gatherFetchAll(): this {
    this.sheet.gatherFetchRange({
      startRowIndex: this.schema.topDataRowIdx,
      startColumnIndex: this.colIndex,
      endColumnIndex: this.colIndex + 1,
    });
    return this;
  }
}
