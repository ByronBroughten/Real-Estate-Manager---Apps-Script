import type {
  UniformRowName,
  UniformRowValue,
  UniformRowValueName,
} from "../00_base/base";
import { UniformRowRawBase } from "./ClassBases/UniformRowRawBase";

export class UniformRowRaw<
  UN extends UniformRowName = UniformRowName,
> extends UniformRowRawBase<UN> {
  valueOrEmpty(colIndex: number): UniformRowValue<UN> | "" {
    return this.cell<UniformRowValueName<UN>>(colIndex).valueOrEmpty();
  }
  updateValue(colIndex: number, value: UniformRowValue<UN>): this {
    this.cell(colIndex).updateValue(value);
    return this;
  }
}
