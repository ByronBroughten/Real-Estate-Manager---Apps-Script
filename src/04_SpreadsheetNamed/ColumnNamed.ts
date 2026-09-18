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
import type {
  ColumnIsFormula,
  ColumnName,
  ColumnValue,
  ColumnValueDeclared,
  ColumnValueName,
} from "../01_generatedConfigs/columnConfigsTypes";
import type { SheetName } from "../01_generatedConfigs/sheetConfigsTypes";
import type { FindReplaceTerms } from "../02_SpreadsheetRaw/ClassTypes/RawState";
import type { CellChange } from "../03_SpreadsheetIndexed/ClassTypes/IndexedState";
import { ColumnIndexed } from "../03_SpreadsheetIndexed/ColumnIndexed";
import { CellNamed } from "./CellNamed";
import { ColumnCommonNamed } from "./ColumnCommonNamed";
import { ColumnMetaNamed } from "./ColumnMetaNamed";
import { SheetNamed } from "./SheetNamed";

export class ColumnNamed<
  SN extends SheetName,
  CN extends ColumnName<SN> = ColumnName<SN>,
> extends ColumnCommonNamed<SN, CN> {
  get sheet(): SheetNamed<SN> {
    return new SheetNamed(this.sheetNamedProps);
  }
  get meta(): ColumnMetaNamed<SN, CN> {
    return new ColumnMetaNamed(this.columnNamedProps);
  }
  get indexed(): ColumnIndexed<ColumnValueName<SN, CN>> {
    return new ColumnIndexed<ColumnValueName<SN, CN>>({
      ...this.sheet.indexed.sheetIndexedProps,
      columnId: this.columnId,
    });
  }
  get raw() {
    return this.indexed.raw;
  }
  get rowIndexesActive(): number[] {
    return this.indexed.cellIndexesActive;
  }
  get valueArrOrEmpty(): ColumnValue<SN, CN>[] {
    return this.indexed.valueArrOrEmpty;
  }
  get valueArrFilterEmpty(): NotEmpty<ColumnValue<SN, CN>>[] {
    return this.indexed.valueArrFilterEmpty;
  }
  // Not delegated to Indexed, so a blank throws with the Named message.
  get valueArrNotEmpty(): NotEmpty<ColumnValue<SN, CN>>[] {
    return this.rowIndexesActive.map((rowIndex) =>
      this.valueNotEmpty(rowIndex),
    );
  }
  get valueArr(): ColumnValueDeclared<SN, CN>[] {
    return this.rowIndexesActive.map((rowIndex) => this.value(rowIndex));
  }
  hasValue(value: ColumnValue<SN, CN>): boolean {
    return this.valueArrOrEmpty.includes(value);
  }
  valueOrEmpty(rowIndex: number): ColumnValue<SN, CN> {
    return this.cell(rowIndex).valueOrEmpty();
  }
  valueNotEmpty(rowIndex: number): NotEmpty<ColumnValue<SN, CN>> {
    return this.cell(rowIndex).valueNotEmpty();
  }
  value(rowIndex: number): ColumnValueDeclared<SN, CN> {
    return this.cell(rowIndex).value();
  }
  cell(rowIndex: number): CellNamed<SN, CN> {
    return new CellNamed({
      ...this.columnNamedProps,
      rowIndex,
    });
  }
  updateAllCells(change: CellChange<ColumnValueName<SN, CN>>): this {
    this.indexed.updateAllCells(change);
    return this;
  }
  updateActiveCells(change: CellChange<ColumnValueName<SN, CN>>): this {
    this.indexed.updateActiveCells(change);
    return this;
  }
  updateAllFormulas(
    formula: ColumnIsFormula<SN, CN> extends true ? string : never,
  ): this {
    this.indexed.updateAllFormulas(formula);
    return this;
  }
  updateActiveFormulas(
    formula: ColumnIsFormula<SN, CN> extends true ? string : never,
  ): this {
    this.indexed.updateActiveFormulas(formula);
    return this;
  }
  // Plain strings, unlike every other write here: Google matches the cell's text.
  findReplace(terms: FindReplaceTerms): this {
    this.indexed.findReplace(terms);
    return this;
  }
  addConditionalFormatRule(declaration: ConditionalFormatDeclaration): this {
    this.indexed.addConditionalFormatRule(declaration);
    return this;
  }
  removeConditionalFormatRules(): this {
    this.indexed.removeConditionalFormatRules();
    return this;
  }
  removeConditionalFormatRule(rule: ConditionalFormatRule): this {
    this.indexed.removeConditionalFormatRule(rule);
    return this;
  }
  gridRangeFromRow(startRowIndex: number) {
    return this.indexed.gridRangeFromRow(startRowIndex);
  }
  addEditWarning(declaration: EditWarningDeclaration = {}): this {
    this.indexed.addEditWarning(declaration);
    return this;
  }
  addEditWarningFromRow(
    startRowIndex: number,
    declaration: EditWarningDeclaration = {},
  ): this {
    this.indexed.addEditWarningFromRow(startRowIndex, declaration);
    return this;
  }
  addEditWarningWholeColumn(declaration: EditWarningDeclaration = {}): this {
    this.indexed.addEditWarningWholeColumn(declaration);
    return this;
  }
  addEditLock(declaration: EditLockDeclaration = {}): this {
    this.indexed.addEditLock(declaration);
    return this;
  }
  addEditLockWholeColumn(declaration: EditLockDeclaration = {}): this {
    this.indexed.addEditLockWholeColumn(declaration);
    return this;
  }
  removeEditProtections(): this {
    this.indexed.removeEditProtections();
    return this;
  }
  removeEditProtectionsWholeColumn(): this {
    this.indexed.removeEditProtectionsWholeColumn();
    return this;
  }
  removeEditProtection(protection: ProtectedRange): this {
    this.indexed.removeEditProtection(protection);
    return this;
  }
  anchoredA1(columnName: ColumnName<SN> = this.columnName): string {
    return this.sheet.column(columnName).indexed.anchoredA1();
  }
  prepFetchSpecific(rowIndexes: number[]): this {
    this.indexed.prepFetchSpecific(rowIndexes);
    return this;
  }
  prepFetchActive(): this {
    this.indexed.prepFetchActive();
    return this;
  }
  prepFetchFull(): this {
    this.indexed.prepFetchFull();
    return this;
  }
  activeCellsToDefault(): this {
    this.indexed.activeCellsToDefault();
    return this;
  }
  emptyActiveCellsToDefualt(): this {
    this.indexed.emptyActiveCellsToDefualt();
    return this;
  }
}
