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

export class UniformRowRaw<
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
  cellTrait<K extends ValueSchemaKey>(key: K): CellValueTrait<VN, K> {
    return this.trait(this.valueName, key) as CellValueTrait<VN, K>;
  }
  value(colIndex: number): UniformRowValue<UN> {
    return this.cell(colIndex, this.valueName).value();
  }
  updateValue(colIndex: number, value: UniformRowValue<UN>): this {
    this.cell(colIndex).updateValue(value);
    return this;
  }
}
