import type {
  UniformRowName,
  UniformRowValueName,
} from "../../00_configPrecursors/configPrecursors";
import { SchemaBase } from "../../01_SpreadsheetSchemaRaw/SchemaBase";
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
