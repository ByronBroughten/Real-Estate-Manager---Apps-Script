import type { ValueName } from "../../01_generatedConfigs/valueSchemas";
import { ColumnSchema } from "../../02_SpreadsheetRaw/SpreadsheetSchema";
import { SheetBaseIndexed, type SheetIndexedProps } from "./SheetBaseIndexed";

export interface ColumnIndexedProps<
  VN extends ValueName = ValueName,
> extends SheetIndexedProps {
  columnId: string;
  valueName?: VN;
}

export class ColumnBaseIndexed<
  VN extends ValueName = ValueName,
> extends SheetBaseIndexed {
  readonly columnId: string;
  readonly valueName?: VN;
  constructor({ columnId, valueName, ...props }: ColumnIndexedProps<VN>) {
    super(props);
    this.columnId = columnId;
    this.valueName = valueName;
  }
  get schema(): ColumnSchema {
    return ColumnSchema.fromColumnId(this.sheetGid, this.columnId);
  }
  get columnIndexedProps(): ColumnIndexedProps<VN> {
    return {
      ...this.sheetIndexedProps,
      columnId: this.columnId,
      valueName: this.valueName,
    };
  }
}
