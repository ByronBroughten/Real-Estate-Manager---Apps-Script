import type { ColumnNameFiltered } from "../01_generatedConfigs/columnConfigsTypes";
import type { SheetNameSimple } from "../01_generatedConfigs/sheetConfigsTypes";
import { ColumnNamedBase } from "../04_SpreadsheetNamed/ColumnNamedBase";
import { ColumnNamed } from "../04_SpreadsheetNamed/ColumnNamed";
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
  get column(): ColumnNamed<SN, CN> {
    return new ColumnNamed(this.columnNamedProps);
  }
  get rowIndexesChecked(): number[] {
    return this.column.rowIndexesActive.filter(
      (rowIndex) => this.column.valueOrEmpty(rowIndex) === true,
    );
  }
  // The active-cells fill, so an uncheck is safe on a sheet pruned to a selection.
  uncheckActiveCells(): this {
    this.column.updateActiveCells({ value: false });
    return this;
  }
}
