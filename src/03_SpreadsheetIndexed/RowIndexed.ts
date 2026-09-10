import type { CellValue, NotEmpty } from "../00_base/base";
import { type Value } from "../01_generatedConfigs/valueSchemas";
import { RowRaw } from "../02_SpreadsheetRaw/RowRaw";
import { CellIndexed } from "./CellIndexed";
import { RowCommonIndexed } from "./RowCommonIndexed";
import type { RowIndexedProps } from "./RowIndexedBase";
import { SheetIndexed } from "./SheetIndexed";

export class RowIndexed extends RowCommonIndexed {
  constructor(props: RowIndexedProps) {
    super(props);
    void this.raw;
  }
  get sheet(): SheetIndexed {
    return new SheetIndexed(this.sheetIndexedProps);
  }
  get raw(): RowRaw {
    return new RowRaw(this.rowIndexedProps);
  }
  get activeValueArr(): CellValue[] {
    return this.raw.activeValueArr;
  }
  valueOrEmpty(columnId: string): Value {
    return this.cell(columnId).valueOrEmpty();
  }
  value(columnId: string): NotEmpty<Value> {
    return this.cell(columnId).value();
  }
  updateValue(columnId: string, value: Value): this {
    this.cell(columnId).updateValue(value);
    return this;
  }
  cell(columnId: string) {
    return new CellIndexed({
      ...this.rowIndexedProps,
      columnId,
    });
  }
  updateToDefault(...columnIds: string[]): RowIndexed {
    columnIds.forEach((columnId) => this.cell(columnId).updateToDefault());
    return this;
  }
  get activeColumnIds(): string[] {
    return [...this.raw.rowState.keys()].map((colIndex) =>
      this.sheet.meta.columnIdByIndex(colIndex),
    );
  }
  get isActive(): boolean {
    return this.raw.rowIsActive();
  }
  get isQueuedForDelete(): boolean {
    return this.raw.isQueuedForDelete;
  }
  // Raw decides, since a checkbox column's blank reads as false and an unread row isn't empty.
  get isBlank(): boolean {
    if (!this.isActive) return false;
    return this._nonFormulaCellsActive.every((cell) => cell.raw.isEmpty);
  }
  get isReusable(): boolean {
    return this.isBlank && !this.raw.isReserved;
  }
  reserve(): void {
    this.raw.reserve();
  }
  // A blank row needs no writes, but its reservation must lift either way.
  clearValues(): this {
    if (!this.isBlank) {
      this._nonFormulaColumnIdsOnSheet.forEach((columnId) => {
        this.updateValue(columnId, "");
      });
    }
    this.raw.release();
    return this;
  }
  delete(): void {
    if (this.sheet.raw.isDownToLastDataRow) {
      this.clearValues();
    } else {
      this.raw.delete();
    }
  }
  private get _nonFormulaCellsActive(): CellIndexed[] {
    return this._nonFormulaColumnIdsOnSheet
      .map((columnId) => this.cell(columnId))
      .filter((cell) => cell.isActive);
  }
  // A configured column the sheet doesn't have holds nothing to read or clear.
  private get _nonFormulaColumnIdsOnSheet(): string[] {
    return this.schema.nonFormulaColumnIds.filter((columnId) =>
      this.sheet.meta.isActiveColumnId(columnId),
    );
  }
}
