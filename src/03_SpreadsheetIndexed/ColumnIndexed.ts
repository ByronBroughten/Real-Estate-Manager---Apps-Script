import type { NotEmpty } from "../00_base/base";
import type {
  ConditionalFormatDeclaration,
  ConditionalFormatRule,
} from "../00_base/ConditionalFormat";
import type {
  EditLockDeclaration,
  EditWarningDeclaration,
  ProtectedRange,
} from "../00_base/ProtectedRange";
import {
  toWireValue,
  type Value,
  type ValueName,
  type VnToCvn,
} from "../01_generatedConfigs/valueSchemas";
import type {
  FindReplaceTerms,
  RowCellChange,
} from "../02_SpreadsheetRaw/ClassTypes/RawState";
import { ColumnRaw } from "../02_SpreadsheetRaw/ColumnRaw";
import { CellIndexed } from "./CellIndexed";
import type { CellChange } from "./ClassTypes/IndexedState";
import { ColumnCommonIndexed } from "./ColumnCommonIndexed";
import { ColumnMetaIndexed } from "./ColumnMetaIndexed";
import { SheetIndexed } from "./SheetIndexed";

export class ColumnIndexed<
  VN extends ValueName = ValueName,
> extends ColumnCommonIndexed<VN> {
  get sheet(): SheetIndexed {
    return new SheetIndexed(this.sheetIndexedProps);
  }
  get meta(): ColumnMetaIndexed<VN> {
    return new ColumnMetaIndexed(this.columnIndexedProps);
  }
  get raw(): ColumnRaw<VnToCvn<VN>> {
    return new ColumnRaw({
      ...this.sheetIndexedProps,
      colIndex: this.colIndex,
    });
  }
  get cellIndexesActive(): number[] {
    return this.raw.cellIndexesActive;
  }
  get cellIndexesFull(): number[] {
    return this.raw.cellIndexesFull;
  }
  get cellsFull(): CellIndexed<VN>[] {
    return this.cellIndexesFull.map((rowIndex) => this.cell(rowIndex));
  }
  prepFetchSpecific(rowIndexes: number[]): this {
    rowIndexes.forEach((rowIndex) => {
      this.cell(rowIndex).prepFetch();
    });
    return this;
  }
  prepFetchActive(): this {
    return this.prepFetchSpecific(this.cellIndexesActive);
  }
  prepFetchFull(): this {
    this.preFetchGridRanges.push({ row: "allDataRows", column: this.columnId });
    return this;
  }
  // Through the cells, not straight to Raw, so the value name's blank is read here too.
  get valueArrOrEmpty(): Value<VN>[] {
    return this.sheet.rowIndexesActive.map((rowIndex) =>
      this.valueOrEmpty(rowIndex),
    );
  }
  get valueArrFilterEmpty(): NotEmpty<Value<VN>>[] {
    return this.valueArrOrEmpty.filter(
      (value): value is NotEmpty<Value<VN>> => value !== "",
    );
  }
  get valueArrNotEmpty(): NotEmpty<Value<VN>>[] {
    return this.sheet.rowIndexesActive.map((rowIndex) =>
      this.cell(rowIndex).valueNotEmpty(),
    );
  }
  hasValue(value: Value<VN>): boolean {
    return this.valueArrOrEmpty.includes(value);
  }
  valueOrEmpty(rowIndex: number): Value<VN> {
    return this.cell(rowIndex).valueOrEmpty();
  }
  valueNotEmpty(rowIndex: number): NotEmpty<Value<VN>> {
    return this.cell(rowIndex).valueNotEmpty();
  }
  cell(rowIndex: number): CellIndexed<VN> {
    return new CellIndexed({
      ...this.columnIndexedProps,
      rowIndex,
    });
  }
  get cellsActive(): CellIndexed<VN>[] {
    return this.cellIndexesActive.map((rowIndex) => this.cell(rowIndex));
  }
  activeCellsToDefault() {
    this.cellsActive.forEach((cell) => {
      cell.updateToDefault();
    });
  }
  allCellsToDefault() {
    this.cellsFull.forEach((cell) => {
      cell.updateToDefault();
    });
  }
  updateAllCells(change: CellChange<VN>): this {
    this.raw.updateAllCells(this._rawChange(change));
    return this;
  }
  updateActiveCells(change: CellChange<VN>): this {
    this.raw.updateActiveCells(this._rawChange(change));
    return this;
  }
  updateAllFormulas(formula: string): this {
    this.schema.validateIsFormula();
    this.raw.updateAllFormulas(formula);
    return this;
  }
  updateActiveFormulas(formula: string): this {
    this.schema.validateIsFormula();
    this.raw.updateActiveFormulas(formula);
    return this;
  }
  // Google matches the text, so neither string is checked against the value config.
  findReplace(terms: FindReplaceTerms): this {
    this.raw.findReplace(terms);
    return this;
  }
  addConditionalFormatRule(declaration: ConditionalFormatDeclaration): this {
    this.raw.addConditionalFormatRule(declaration);
    return this;
  }
  removeConditionalFormatRules(): this {
    this.raw.removeConditionalFormatRules();
    return this;
  }
  removeConditionalFormatRule(rule: ConditionalFormatRule): this {
    this.raw.removeConditionalFormatRule(rule);
    return this;
  }
  addEditWarning(declaration: EditWarningDeclaration = {}): this {
    this.raw.addEditWarning(declaration);
    return this;
  }
  addEditLock(declaration: EditLockDeclaration = {}): this {
    this.raw.addEditLock(declaration);
    return this;
  }
  removeEditProtections(): this {
    this.raw.removeEditProtections();
    return this;
  }
  removeEditProtection(protection: ProtectedRange): this {
    this.raw.removeEditProtection(protection);
    return this;
  }
  anchoredA1(colIndex = this.colIndex): string {
    return this.sheet.anchoredA1(colIndex);
  }
  // A colour-only write is legitimate on a formula column; a value is not.
  private _rawChange({
    value,
    ...rest
  }: CellChange<VN>): RowCellChange<VnToCvn<VN>> {
    if (value === undefined) return rest;
    this.schema.validateDataNotFormula();
    return { ...rest, value: toWireValue(value) };
  }
  emptyActiveCellsToDefualt(): this {
    this.cellsActive.forEach((cell) => {
      if (cell.raw.isEmpty) {
        cell.updateToDefault();
      }
    });
    return this;
  }
}
