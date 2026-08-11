import type { SheetName } from "../../1.0 Configs/2.0 sheetConfigs";
import type { ColumnName } from "../../1.0 Configs/3.0 columnConfigs";
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
