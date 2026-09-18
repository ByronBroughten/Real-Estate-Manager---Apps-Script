import type { CellValue } from "../../00_Source/CellValues/cellValues";
import { RowBaseIndexed } from "./RowBaseIndexed";

export abstract class RowCommonIndexed extends RowBaseIndexed {
  abstract get activeValueArr(): CellValue[];
  hasValue(value: unknown): boolean {
    return this.activeValueArr.includes(value as CellValue);
  }
  prepFetchFull(): void {
    this.fetchTargets.push({
      kind: "fullRow",
      row: this.rowIndex,
    });
  }
}
