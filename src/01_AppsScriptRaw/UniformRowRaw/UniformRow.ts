import type {
  UniformRowName,
  UniformRowValue,
  UniformRowValueName,
} from "../../00_traitPrecursors/base";
import { type CellValueTrait } from "../../03_Schemas/baseValueSchemas";
import type { ValueSchemaKey } from "../../03_Schemas/valueSchema";
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
  cellTrait<K extends ValueSchemaKey>(key: K): CellValueTrait<VN, K> {
    return this.raw.cellTrait(this.valueName, key) as CellValueTrait<VN, K>;
  }
  value(colIndex): UniformRowValue<UN> {
    return this.raw.value(colIndex, this.valueName) as UniformRowValue<UN>;
  }
  updateValue(colIndex: number, value: UniformRowValue<UN>): UniformRow<UN> {
    this.rowState.set(colIndex, value);
    return this;
  }
  gatherAppendRequest(): void {
    // polymorphism
    this.raw.gatherAppendRequest();
  }
  gatherUpdateRequest(colIndex: number): void {
    // polymorphism
    this.raw.gatherUpdateRequest(colIndex);
  }
}
