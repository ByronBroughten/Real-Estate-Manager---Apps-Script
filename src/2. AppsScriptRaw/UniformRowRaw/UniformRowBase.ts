import type {
  UniformRowName,
  UniformRowValueName,
} from "../../1.0 Configs/0.0 ConfigPrecursors";
import { SchemaBase } from "../../1.1 SpreadsheetSchemaRaw/SchemaBase";
import { RowRawBase, type RowRawProps } from "../ClassBases/RowRawBase";

export interface RowUniformProps<
  UN extends UniformRowName,
> extends RowRawProps {
  uniformRowName: UN;
}

export class UniformRowBase<
  UN extends UniformRowName,
  VN extends UniformRowValueName<UN> = UniformRowValueName<UN>,
> extends RowRawBase {
  readonly uniformRowName: UN;
  constructor({ uniformRowName, ...rest }: RowUniformProps<UN>) {
    super(rest);
    this.uniformRowName = uniformRowName;
    this.validateUniformRowIndex();
  }
  get valueName(): VN {
    return this.baseSchema.uniformValueName(this.uniformRowName) as VN;
  }
  get baseSchema(): SchemaBase {
    return new SchemaBase();
  }
  validateUniformRowIndex() {
    this.baseSchema.validateUniformRowIndex(this.rowIndex);
  }
}
