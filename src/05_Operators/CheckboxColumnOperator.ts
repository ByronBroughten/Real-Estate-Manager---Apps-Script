import type { ColumnNameFiltered } from "../01_generatedConfigs/columnConfigsTypes";
import type { SheetNameSimple } from "../01_generatedConfigs/sheetConfigsTypes";
import { ColumnNamedBase } from "../04_SpreadsheetNamed/ColumnNamedBase";
import { DataColumnNamed } from "../04_SpreadsheetNamed/DataColumnNamed";
import type { SheetNamed } from "../04_SpreadsheetNamed/SheetNamed";
import { SpreadsheetNamed } from "../04_SpreadsheetNamed/SpreadsheetNamed";

export type CheckboxColumnName<SN extends SheetNameSimple> = ColumnNameFiltered<
  SN,
  "boolean",
  false
>;

export class CheckboxColumnOperator<
  SN extends SheetNameSimple,
  CN extends CheckboxColumnName<SN>,
> extends ColumnNamedBase<SN, CN> {
  get ss(): SpreadsheetNamed {
    return new SpreadsheetNamed(this.spreadsheetNamedProps);
  }
  get sheet(): SheetNamed<SN> {
    return this.ss.sheet(this.sheetName);
  }
  get column(): DataColumnNamed<SN, CN> {
    return new DataColumnNamed(this.columnNamedProps);
  }
  get rowIndexesChecked(): number[] {
    return this.column.rowIndexesActive.filter(
      (rowIndex) => this.column.value(rowIndex) === true,
    );
  }
  // One queued column fill, so a bulk select still costs a single request.
  setAll(isChecked: boolean): this {
    this.column.allCellsToValue(isChecked);
    return this;
  }
  uncheckAll(): this {
    return this.setAll(false);
  }
}
