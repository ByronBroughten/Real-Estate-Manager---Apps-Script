import type { CellValue } from "../00_base/base";
import { RowIndexedBase } from "./RowIndexedBase";

export abstract class RowCommonIndexed extends RowIndexedBase {
  abstract get activeValueArr(): CellValue[];
  hasValue(value: unknown): boolean {
    return this.activeValueArr.includes(value as CellValue);
  }
  prepFetchFull(): void {
    this.fetchTargets.push({
      row: this.rowIndex,
      column: "allDataColumns",
    });
  }
}
