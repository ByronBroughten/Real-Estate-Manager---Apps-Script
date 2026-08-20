import type {
  UniformRowName,
  UniformRowValue,
  UniformRowValueName,
} from "../00_base/base";
import { type CellValueTrait } from "../00_base/baseValueSchemas";
import type { ValueSchemaKey } from "../00_base/valueSchema";
import { UniformRowBase } from "./ClassBases/UniformRowBase";
import { SheetRaw } from "./SheetRaw";

export class UniformRow<
  UN extends UniformRowName = UniformRowName,
  VN extends UniformRowValueName<UN> = UniformRowValueName<UN>,
> extends UniformRowBase<UN> {
  get sheet(): SheetRaw {
    return new SheetRaw(this.sheetRawProps);
  }
  uniformCellTrait<K extends ValueSchemaKey>(key: K): CellValueTrait<VN, K> {
    return super.cellTrait(this.valueName, key) as CellValueTrait<VN, K>;
  }
  uniformValue(colIndex: number): UniformRowValue<UN> {
    return super.value(colIndex, this.valueName) as UniformRowValue<UN>;
  }
  updateValue(colIndex: number, value: UniformRowValue<UN>): this {
    this.rowState.set(colIndex, value);
    return this;
  }
}
