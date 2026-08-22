import type { SheetName } from "../../02_generatedTraits/02_sheetTraitsTypes";
import type { ColumnName } from "../../02_generatedTraits/03_columnTraits";
import { SheetNamedBase, type SheetNamedProps } from "./SheetNamedBase";

export interface ColumnNamedProps<
  TN extends SheetName,
  CN extends ColumnName<TN>,
> extends SheetNamedProps<TN> {
  columnName: CN;
}

export class ColumnNamedBase<
  TN extends SheetName,
  CN extends ColumnName<TN>,
> extends SheetNamedBase<TN> {
  readonly columnName: CN;
  constructor(props: ColumnNamedProps<TN, CN>) {
    super(props);
    this.columnName = props.columnName;
  }
  get columnNamedProps(): ColumnNamedProps<TN, CN> {
    return {
      ...this.sheetNamedProps,
      columnName: this.columnName,
    };
  }
}
