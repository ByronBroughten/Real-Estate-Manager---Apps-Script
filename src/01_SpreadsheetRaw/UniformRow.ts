import type {
  CellValueName,
  UniformRowName,
  UniformRowValue,
  UniformRowValueName,
} from "../00_base/base";
import {
  getCellValTrait,
  type CellValueTrait,
} from "../00_base/baseValueSchemas";
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
  private trait<VN extends CellValueName, K extends ValueSchemaKey>(
    valueName: VN,
    key: K,
  ): CellValueTrait<VN, K> {
    return getCellValTrait(valueName, key);
  }
  uniformCellTrait<K extends ValueSchemaKey>(key: K): CellValueTrait<VN, K> {
    return this.trait(this.valueName, key) as CellValueTrait<VN, K>;
  }
  uniformValue(colIndex: number): UniformRowValue<UN> {
    return super.value(colIndex, this.valueName) as UniformRowValue<UN>;
  }
  updateValue(colIndex: number, value: UniformRowValue<UN>): this {
    this.rowState.set(colIndex, value);
    return this;
  }
}
