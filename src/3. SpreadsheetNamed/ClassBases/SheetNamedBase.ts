import type { TableName } from "../../0. spreadsheetMetaData/4.0 tableAttributes";
import type { ColumnName } from "../../0. spreadsheetMetaData/5. allColumnAttributes";
import type { SheetSchema } from "../../1. SpreadsheetSchema/SheetSchema";
import type { RowState } from "./RowNamedBase";
import {
  SpreadsheetNamedBase,
  type SpreadsheetNamedProps,
} from "./SpreadsheetNamedBase";

export type RowChangesToSave<TN extends TableName> = {
  add: boolean;
  delete: boolean;
  update: Set<ColumnName<TN>>;
};

export type ChangesToSave<TN extends TableName> = {
  [rowId: string]: RowChangesToSave<TN>;
};

export type HeaderIndices<TN extends TableName> = {
  [CN in ColumnName<TN>]: number;
};
export type Rows<TN extends TableName> = {
  [id in string]: RowState<TN>;
};

export type SheetState<TN extends TableName> = {
  sheetName;

  unaccountedHeaders: string[];
  isAddOnly: boolean;

  // Does rows include headers? No. I want their data to be consistent.
  headerIndicesBase1: HeaderIndices<TN>;
  bodyRows: Rows<TN>;
  bodyRowOrder: string[];
  changesToSave: ChangesToSave<TN>;
};

export interface SheetNamedProps<
  TN extends TableName,
> extends SpreadsheetNamedProps {
  tableName: TN;
}

export class SheetNamedBase<TN extends TableName> extends SpreadsheetNamedBase {
  readonly tableName: TN;
  constructor({ tableName, ...props }: SheetNamedProps<TN>) {
    super(props);
    this.tableName = tableName;
  }
  get sheetState(): SheetState<TN> {
    return this.spreadsheetTables[this.tableName];
  }
  get sheetProps(): SheetNamedProps<TN> {
    return {
      tableName: this.tableName,
      ...this.spreadsheetProps,
    };
  }
  get tableSchema(): SheetSchema<TN> {
    return this.spreadsheetSchema.sheet(this.tableName);
  }
  get topBodyRowIdxBase1(): number {
    return this.config("topBodyRowIdxBase1");
  }
}
