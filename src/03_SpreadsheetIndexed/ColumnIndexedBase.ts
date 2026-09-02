import type { ValueName } from "../01_generatedConfigs/valueSchemas";
import { ColumnSchema } from "../02_SpreadsheetRaw/SpreadsheetSchema";
import { SheetIndexedBase, type SheetIndexedProps } from "./SheetIndexedBase";

export interface ColumnIndexedProps<
  VN extends ValueName = ValueName,
> extends SheetIndexedProps {
  columnId: string;
  valueName?: VN;
}

export class ColumnIndexedBase<
  VN extends ValueName = ValueName,
> extends SheetIndexedBase {
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
