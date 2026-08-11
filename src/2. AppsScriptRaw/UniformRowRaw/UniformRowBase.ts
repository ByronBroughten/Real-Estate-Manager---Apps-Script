import { SchemaBase } from "../../1.1 SpreadsheetSchemaRaw/SchemaBase";
import type { ValueName } from "../../2.0 Schemas/3.2 valueSchemas";
import { RowRawBase, type RowRawProps } from "../ClassBases/RowRawBase";

export interface RowUniformProps<VN extends ValueName> extends RowRawProps {
  valueName: VN;
}

export class UniformRowBase<VN extends ValueName> extends RowRawBase {
  readonly valueName: VN;
  constructor({ valueName, ...rest }: RowUniformProps<VN>) {
    super(rest);
    this.valueName = valueName;
    this.validateUniformRowIndex();
  }
  get baseSchema(): SchemaBase {
    return new SchemaBase();
  }
  validateUniformRowIndex() {
    this.baseSchema.validateUniformRowIndex(this.rowIndex);
  }
}
