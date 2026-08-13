import type {
  UniformRowName,
  UniformRowValueName,
} from "../../1.0 Configs/0.0 ConfigPrecursors";
import type { ValueSchemaKey } from "../../2.0 Schemas/3.0 valueSchema";
import {
  type Value,
  type ValueTrait,
} from "../../2.0 Schemas/3.2 valueSchemas";
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
  value(colIndex): ValueTrait<VN, "type"> {
    return this.raw.value(colIndex, this.valueName) as ValueTrait<VN, "type">;
  }
  updateValue(colIdx: number, value: Value<VN>): UniformRow<UN> {
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
