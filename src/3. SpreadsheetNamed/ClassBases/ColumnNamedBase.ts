import type { SheetName } from "../../0. spreadsheetMetaData/4.0 tableAttributes";
import type { ColumnName } from "../../0. spreadsheetMetaData/5. allColumnAttributes";
import { SheetNamedBase, type SheetNamedProps } from "./SheetNamedBase";

interface ColumnNamedProps<
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
