import type { ColumnName } from "../01_generatedConfigs/columnConfigsTypes";
import type { SheetName } from "../01_generatedConfigs/sheetConfigsTypes";
import { ColumnSchema } from "../02_SpreadsheetRaw/SpreadsheetSchema";
import {
  SheetNamedBase,
  type SheetNamedProps,
} from "./ClassBases/SheetNamedBase";

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
  get schema(): ColumnSchema<TN, CN> {
    return ColumnSchema.fromColumnName(this.sheetName, this.columnName);
  }
  get columnNamedProps(): ColumnNamedProps<TN, CN> {
    return {
      ...this.sheetNamedProps,
      columnName: this.columnName,
    };
  }
}
