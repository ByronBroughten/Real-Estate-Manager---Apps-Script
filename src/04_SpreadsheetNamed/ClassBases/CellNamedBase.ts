import type { SheetName } from "../../01_generatedConfigs/sheetConfigsTypes";
import type { ColumnName } from "../../01_generatedConfigs/columnConfigsTypes";
import { ColumnNamedBase, type ColumnNamedProps } from "../ColumnNamedBase";

export interface CellNamedProps<
  TN extends SheetName,
  CN extends ColumnName<TN>,
> extends ColumnNamedProps<TN, CN> {
  rowIndex: number;
}

export class CellNamedBase<
  TN extends SheetName,
  CN extends ColumnName<TN>,
> extends ColumnNamedBase<TN, CN> {
  readonly rowIndex: number;
  constructor({ rowIndex, ...props }: CellNamedProps<TN, CN>) {
    super(props);
    this.rowIndex = rowIndex;
  }
  get cellNamedProps(): CellNamedProps<TN, CN> {
    return {
      ...this.columnNamedProps,
      rowIndex: this.rowIndex,
    };
  }
}
