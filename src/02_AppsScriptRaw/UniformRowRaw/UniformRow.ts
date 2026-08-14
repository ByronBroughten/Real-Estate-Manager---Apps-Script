import type {
  UniformRowName,
  UniformRowValue,
  UniformRowValueName,
} from "../../00_configPrecursors/configPrecursors";
import type { ValueSchemaKey } from "../../02_Schemas/03_valueSchema";
import { type ValueTrait } from "../../02_Schemas/03_valueSchemas";
import { RowRaw } from "../RowRaw";
import { SheetRaw } from "../SheetRaw";
import { UniformRowBase } from "./UniformRowBase";

export class UniformRow<
  UN extends UniformRowName = UniformRowName,
  VN extends UniformRowValueName<UN> = UniformRowValueName<UN>,
> extends UniformRowBase<UN> {
  get raw(): RowRaw {
    return new RowRaw(this.rowRawProps);
  }
  get sheet(): SheetRaw {
    return new SheetRaw(this.sheetRawProps);
  }
  hasValue(value: unknown): boolean {
    return this.raw.hasValue(value);
  }
  cellTrait<K extends ValueSchemaKey>(key: K): ValueTrait<VN, K> {
    return this.raw.cellTrait(this.valueName, key) as ValueTrait<VN, K>;
  }
  value(colIndex): UniformRowValue<UN> {
    return this.raw.value(colIndex, this.valueName) as UniformRowValue<UN>;
  }
  updateValue(colIdx: number, value: UniformRowValue<UN>): UniformRow<UN> {
    this.rowState.set(colIdx, value);
    return this;
  }
  gatherAppendRequest(): void {
    // polymorphism
    this.raw.gatherAppendRequest();
  }
  gatherUpdateRequest(colIdx: number): void {
    // polymorphism
    this.raw.gatherUpdateRequest(colIdx);
  }
}
