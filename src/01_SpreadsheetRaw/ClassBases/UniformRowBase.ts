import type {
  UniformRowName,
  UniformRowValueName,
} from "../../00_rawPrecursors/base";
import { SchemaBase } from "../../03_SpreadsheetIndexed/SchemaBase";
import { RowRawBase, type RowRawProps } from "./RowRawBase";

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
    this.ensureStateExists();
  }
  get valueName(): VN {
    return this.baseSchema.uniformValueName(this.uniformRowName) as VN;
  }
  get baseSchema(): SchemaBase {
    return new SchemaBase();
  }
  validateUniformRowIndex() {
    this.baseSchema.validateUniformRowIndex(this.rowIndex, this.uniformRowName);
  }
}
