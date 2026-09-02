import type { ValueName } from "../01_generatedConfigs/valueSchemas";
import { ColumnSchemaIndexed } from "./ColumnSchemaIndexed";
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
  get schema(): ColumnSchemaIndexed<VN> {
    return new ColumnSchemaIndexed({
      sheetGid: this.sheetGid,
      columnId: this.columnId,
    });
  }
  get columnIndexedProps(): ColumnIndexedProps<VN> {
    return {
      ...this.sheetIndexedProps,
      columnId: this.columnId,
      valueName: this.valueName,
    };
  }
}
