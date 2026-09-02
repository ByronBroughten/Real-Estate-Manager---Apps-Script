import type {
  UniformRowName,
  UniformRowValue,
  UniformRowValueName,
} from "../../00_base/base";
import type { StrictOmit } from "../../utils/Obj";
import { getUniformRowIndex } from "../BaseSchema";
import { RowCommonRaw } from "./RowCommonRaw";
import type { RowRawProps } from "./RowRawBase";

export interface RowUniformProps<UN extends UniformRowName> extends StrictOmit<
  RowRawProps,
  "rowIndex"
> {
  uniformRowName: UN;
}

export class UniformRowRawBase<
  UN extends UniformRowName,
  VN extends UniformRowValueName<UN> = UniformRowValueName<UN>,
> extends RowCommonRaw {
  readonly uniformRowName: UN;
  constructor({ uniformRowName, ...rest }: RowUniformProps<UN>) {
    super({
      ...rest,
      rowIndex: getUniformRowIndex(uniformRowName),
    });
    this.uniformRowName = uniformRowName;
    this.validateUniformState();
  }
  get valueName(): VN {
    return this.schema.uniformValueName(this.uniformRowName) as VN;
  }
  get activeValueArr(): UniformRowValue<UN>[] {
    return [...this.rowState.values()] as UniformRowValue<UN>[];
  }
  validateUniformState() {
    this.validateUniformRowIndex();
    this.ensureStateExists();
  }
  private validateUniformRowIndex() {
    this.schema.validateUniformRowIndex(this.rowIndex, this.uniformRowName);
  }
}
