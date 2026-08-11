import type { CellValueName } from "../../1.0 Configs/0.0 ConfigPrecursors";
import type { ValueSchemaKey } from "../../2.0 Schemas/3.0 valueSchema";
import {
  type Value,
  type ValueTrait,
} from "../../2.0 Schemas/3.2 valueSchemas";
import { RowRaw } from "../RowRaw";
import { SheetRaw } from "../SheetRaw";
import { UniformRowBase } from "./UniformRowBase";

export class UniformRow<VN extends CellValueName> extends UniformRowBase<VN> {
  get raw() {
    return new RowRaw(this.rowRawProps);
  }
  get sheet() {
    return new SheetRaw(this.sheetRawProps);
  }
  cellTrait<K extends ValueSchemaKey>(key: K): ValueTrait<VN, K> {
    return this.raw.cellTrait(this.valueName, key);
  }
  value(colIndex): ValueTrait<VN, "type"> {
    return this.raw.value(colIndex, this.valueName) as ValueTrait<VN, "type">;
  }
  updateValue(colIdx: number, value: Value<VN>): UniformRow<VN> {
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
