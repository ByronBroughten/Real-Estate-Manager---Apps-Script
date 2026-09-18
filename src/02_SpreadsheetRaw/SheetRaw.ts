import type { CellValueName } from "../00_base/base";
import {
  conditionalFormatRulesEqual,
  rangeEqual,
  type ConditionalFormatDeclaration,
  type ConditionalFormatRule,
} from "../00_base/ConditionalFormat";
import {
  isWholeColumnGridRange,
  protectedRangeContentSatisfies,
  protectedRangesEqual,
  protectionRangeEqual,
  protectionRangeHasRowCoordinates,
  type EditLockDeclaration,
  type EditWarningDeclaration,
  type ProtectedRange,
  type ProtectedRangeContent,
  type ProtectionGridRange,
  type WholeSheetEditLockDeclaration,
  type WholeSheetEditWarningDeclaration,
} from "../00_base/ProtectedRange";
import type { GridRangeProps, SheetSnapshot } from "../00_base/RawSource";
import type { Value } from "../01_generatedConfigs/valueSchemas";
import { Arr } from "../utils/Arr";
import { assertValueAndFormulaExclusive } from "./CellRaw";
import type { RowCommonRaw } from "./ClassBases/RowCommonRaw";
import { SheetCommonRaw } from "./ClassBases/SheetCommonRaw";
import {
  type ColumnFill,
  type FindReplaceTerms,
  type SortParameters,
} from "./ClassTypes/RawState";
import { ColumnRaw } from "./ColumnRaw";
import { RowRaw } from "./RowRaw";
import { SheetMetaRaw } from "./SheetMetaRaw";
import { SpreadsheetRaw } from "./SpreadsheetRaw";

export class SheetRaw extends SheetCommonRaw {
  get ss(): SpreadsheetRaw {
    return new SpreadsheetRaw(this.spreadsheetRawProps);
  }
  get meta(): SheetMetaRaw {
    return new SheetMetaRaw(this.sheetRawProps);
  }
  get rowIndexesAreStale(): boolean {
    return (
      this.sheetState.knownTable !== null && this.activeTable.rowIndexesAreStale
    );
  }
  get hasFetchedProperties(): boolean {
    return this.sheetState.knownTable !== null;
  }
  get dataGridRange(): GridRangeProps {
    return {
      sheetId: this.sheetGid,
      startRowIndex: this.schema.topDataRowIdx,
      endRowIndex: this.activeTable.endRowIndex,
      startColumnIndex: this.activeTable.startColumnIndex,
      endColumnIndex: this.activeTable.endColumnIndex,
    };
  }
  get wholeSheetGridRange(): ProtectionGridRange {
    return { sheetId: this.sheetGid };
  }
  rowGridRange(rowIndex: number): GridRangeProps {
    return {
      sheetId: this.sheetGid,
      startRowIndex: rowIndex,
      endRowIndex: rowIndex + 1,
    };
  }
  get title(): string {
    if (this.sheetState.title === null) {
      throw new Error(
        `Sheet title is null for sheetGid ${this.sheetGid}. Ensure that the sheet properties have been fetched.`,
      );
    }
    return this.sheetState.title;
  }
  get activeRowIndexes(): number[] {
    const indexes = Array.from(this.sheetState.rowStates.keys());
    return Arr.sortAscending(indexes);
  }
  get activeRowCount(): number {
    return this.sheetState.rowStates.size;
  }
  get lastActiveRowIndex(): number {
    return Math.max(...this.rowStates.keys());
  }
  get rowIndexesActive(): number[] {
    return this.activeRowIndexes.filter((rowIndex) =>
      this.schema.isDataRowIndex(rowIndex),
    );
  }
  get rowIndexesFull(): number[] {
    return Arr.indexesFromUntil(
      this.schema.topDataRowIdx,
      this.activeTable.endRowIndex,
    );
  }
  get rowsFull(): RowRaw[] {
    return this.rowIndexesFull.map((rowIndex) => this.row(rowIndex));
  }
  get rows(): RowRaw[] {
    return this.rowIndexesActive.map((index) => this.row(index));
  }
  get topRow(): RowRaw {
    return this.row(this.schema.topDataRowIdx);
  }
  get rowCount(): number {
    return this.activeRowCount - this.schema.topDataRowIdx;
  }
  // The one place the invariant's threshold is written, so no tier can drift from it.
  get isDownToLastDataRow(): boolean {
    return this.dataRowCountAfterFlush <= 1;
  }
  // Local row state holds only fetched rows, so the table's extent is the source.
  get dataRowCountAfterFlush(): number {
    const { endRowIndex } = this.activeTable;
    return (
      endRowIndex - this.schema.topDataRowIdx - this._queuedRowDeleteCount()
    );
  }
  private _queuedRowDeleteCount(): number {
    let count = 0;
    this.allChangesToSave.forEach((change, sheetRowId) => {
      if (change.level !== "row" || typeof sheetRowId !== "string") return;
      if (!change.delete) return;
      if (
        this.schema.idsFromSheetRowId(sheetRowId).sheetGid !== this.sheetGid
      ) {
        return;
      }
      count++;
    });
    return count;
  }
  get cellStateIsStale(): boolean {
    return this.sheetState.cellStateIsStale;
  }
  markRowIndexesStale(): void {
    this.activeTable.markRowIndexesStale();
  }
  invalidateCellState(): void {
    this.sheetState.rowStates.clear();
    this.sheetState.cellStateIsStale = true;
  }
  findReplace(terms: FindReplaceTerms): this {
    this.ss.findReplace({ ...terms, scope: { sheetId: this.sheetGid } });
    return this;
  }
  clearRowIndexStale(): void {
    this.activeTable.clearRowIndexStale();
  }
  ensureColIndexIsStale(colIndex: number): void {
    this.activeTable.ensureColIndexIsStale(colIndex);
  }
  row(rowIndex: number): RowRaw {
    return new RowRaw({
      rowIndex,
      ...this.sheetRawProps,
    });
  }
  // Every guess this sheet's columns made from a sample had none behind it.
  topDataRowIsBlank(): boolean {
    if (this.topRow.rowIsActive()) {
      return this.fullTableColIndexes.every(
        (colIndex) => this.topRow.valueOrEmpty(colIndex) === "",
      );
    }
    // A queued-delete top row has no cells; column facts still describe the live sheet.
    return this.fullTableColIndexes.every(
      (colIndex) => this.meta.column(colIndex).activeTopValue === "",
    );
  }
  // Either kind of row, for callers that only touch what the two share.
  rowCommon(rowIndex: number): RowCommonRaw {
    if (this.schema.isUniformRowIndex(rowIndex)) {
      return this.meta.uniformRowByIndex(rowIndex);
    } else {
      return this.row(rowIndex);
    }
  }
  column<VN extends CellValueName = CellValueName>(
    colIndex: number,
  ): ColumnRaw<VN> {
    return new ColumnRaw<VN>({
      colIndex,
      ...this.sheetRawProps,
    });
  }
  columnByHeader<VN extends CellValueName = CellValueName>(
    header: string,
  ): ColumnRaw<VN> {
    return this.column<VN>(this.meta.tableHeaderRow.colIndexOfValue(header));
  }
  gatherFetchDataColumnsUsingHeaders<HD extends string>(
    ...headers: HD[]
  ): Record<HD, ColumnRaw> {
    return headers.reduce(
      (acc, header) => {
        acc[header] = this.columnByHeader(header).gatherFetchFull();
        return acc;
      },
      {} as Record<HD, ColumnRaw>,
    );
  }
  gatherFetchProperties(startTableColIndex: number): this {
    // The live start is unknown until this probe comes back, so aim the layout constant.
    this.meta.tableHeaderRow.cell(startTableColIndex).gatherFetchRange();
    return this;
  }
  gatherFetchConditionalFormatRules(): this {
    this.sheetState.gatherConditionalFormats = true;
    return this;
  }
  conditionalFormatRules(): ConditionalFormatRule[] {
    const rules = this.sheetState.conditionalFormatRules;
    if (rules === null) {
      throw new Error(
        `Conditional format rules have not been fetched for sheetGid ${this.sheetGid}.`,
      );
    }
    return rules;
  }
  addConditionalFormatRule(declaration: ConditionalFormatDeclaration): this {
    return this.addConditionalFormatRuleAt(this.dataGridRange, declaration);
  }
  removeConditionalFormatRules(): this {
    return this.removeConditionalFormatRulesAt(this.dataGridRange);
  }
  addConditionalFormatRuleAt(
    range: GridRangeProps,
    declaration: ConditionalFormatDeclaration,
  ): this {
    this.activeTable.assertRowIndexesNotStale();
    this.assertConditionalFormatIndexesNotStale();
    const rule: Extract<ConditionalFormatRule, { kind: "boolean" }> = {
      kind: "boolean",
      ranges: [range],
      condition: declaration.condition,
      format: declaration.format,
    };
    if (
      this._pendingConditionalFormatRules().some((pending) =>
        conditionalFormatRulesEqual(pending, rule),
      )
    ) {
      return this;
    }
    this.updateRequests.addConditionalFormat.push({
      kind: "addConditionalFormatRule",
      index: 0,
      rule,
    });
    return this;
  }
  private _pendingConditionalFormatRules(): ConditionalFormatRule[] {
    const fetched = this.sheetState.conditionalFormatRules;
    const rules = fetched === null ? [] : [...fetched];
    const deletes = [...this.updateRequests.deleteConditionalFormat]
      .filter((operation) => operation.kind === "deleteConditionalFormatRule")
      .filter((operation) => operation.sheetId === this.sheetGid)
      .sort((left, right) => right.index - left.index);
    deletes.forEach((operation) => {
      rules.splice(operation.index, 1);
    });
    this.updateRequests.addConditionalFormat.forEach((operation) => {
      if (operation.kind !== "addConditionalFormatRule") return;
      if (operation.rule.ranges[0]?.sheetId !== this.sheetGid) return;
      rules.splice(operation.index, 0, operation.rule);
    });
    return rules;
  }
  removeConditionalFormatRulesAt(range: GridRangeProps): this {
    this.activeTable.assertRowIndexesNotStale();
    this.assertConditionalFormatIndexesNotStale();
    this.conditionalFormatRules().forEach((rule, index) => {
      if (rule.ranges.length !== 1) return;
      if (!rangeEqual(range, rule.ranges[0])) return;
      this.updateRequests.deleteConditionalFormat.push({
        kind: "deleteConditionalFormatRule",
        sheetId: this.sheetGid,
        index,
      });
    });
    return this;
  }
  removeConditionalFormatRule(rule: ConditionalFormatRule): this {
    this.activeTable.assertRowIndexesNotStale();
    this.assertConditionalFormatIndexesNotStale();
    this.conditionalFormatRules().forEach((existing, index) => {
      if (!conditionalFormatRulesEqual(existing, rule)) return;
      this.updateRequests.deleteConditionalFormat.push({
        kind: "deleteConditionalFormatRule",
        sheetId: this.sheetGid,
        index,
      });
    });
    return this;
  }
  markConditionalFormatIndexesStale(): void {
    this.sheetState.conditionalFormatIndexesAreStale = true;
  }
  assertConditionalFormatIndexesNotStale(): void {
    if (!this.sheetState.conditionalFormatIndexesAreStale) return;
    throw new Error(
      `Conditional format indexes are stale for sheetGid ${this.sheetGid}. Re-fetch the sheet's rules before mutating them again.`,
    );
  }
  hasQueuedFullRowFetch(rowIndex: number): boolean {
    return this.sheetState.rowIndexesToFinalize.has(rowIndex);
  }
  integrateSheetState(sheet: SheetSnapshot): void {
    this._initSheetState(sheet);
    this.sheetState.cellStateIsStale = false;
    if (sheet.gridBlocks) {
      this._integrateSheetData(sheet.gridBlocks);
    }
  }
  integrateConditionalFormatRules(rules: ConditionalFormatRule[]): void {
    this.sheetState.conditionalFormatRules = rules;
    this.sheetState.gatherConditionalFormats = false;
    this.sheetState.conditionalFormatIndexesAreStale = false;
  }
  gatherFetchProtectedRanges(): this {
    this.sheetState.gatherProtectedRanges = true;
    return this;
  }
  protectedRanges(): ProtectedRange[] {
    this.assertProtectedRangesNotStale();
    const protections = this.sheetState.protectedRanges;
    if (protections === null) {
      throw new Error(
        `Protected ranges have not been fetched for sheetGid ${this.sheetGid}.`,
      );
    }
    return protections;
  }
  addEditWarning(declaration: EditWarningDeclaration = {}): this {
    return this.addEditWarningAt(this.dataGridRange, declaration);
  }
  addEditLock(declaration: EditLockDeclaration = {}): this {
    return this.addEditLockAt(this.dataGridRange, declaration);
  }
  addEditWarningWholeSheet(
    declaration: WholeSheetEditWarningDeclaration = {},
  ): this {
    return this._queueProtection({
      kind: "warning",
      range: this.wholeSheetGridRange,
      description: declaration.description ?? "",
      users: [],
      groups: [],
      unprotectedRanges: declaration.unprotectedRanges ?? [],
    });
  }
  addEditLockWholeSheet(declaration: WholeSheetEditLockDeclaration = {}): this {
    return this._queueProtection({
      kind: "lock",
      range: this.wholeSheetGridRange,
      description: declaration.description ?? "",
      users: declaration.users ?? [],
      groups: declaration.groups ?? [],
      unprotectedRanges: declaration.unprotectedRanges ?? [],
    });
  }
  addEditWarningAt(
    range: ProtectionGridRange,
    declaration: EditWarningDeclaration = {},
  ): this {
    return this._queueProtection({
      kind: "warning",
      range,
      description: declaration.description ?? "",
      users: [],
      groups: [],
      unprotectedRanges: [],
    });
  }
  addEditLockAt(
    range: ProtectionGridRange,
    declaration: EditLockDeclaration = {},
  ): this {
    return this._queueProtection({
      kind: "lock",
      range,
      description: declaration.description ?? "",
      users: declaration.users ?? [],
      groups: declaration.groups ?? [],
      unprotectedRanges: [],
    });
  }
  private _queueProtection(protection: ProtectedRangeContent): this {
    this._assertProtectionWriteCoordinatesNotStale(
      protection.range,
      protection.unprotectedRanges,
    );
    this.assertProtectedRangesNotStale();
    if (
      this._pendingProtectedRangeContents().some((pending) =>
        protectedRangeContentSatisfies(pending, protection),
      )
    ) {
      return this;
    }
    this.updateRequests.addProtectedRange.push({
      kind: "addProtectedRange",
      protection,
    });
    return this;
  }
  private _pendingProtectedRangeContents(): ProtectedRangeContent[] {
    const fetched = this.sheetState.protectedRanges;
    const protections: ProtectedRange[] = fetched === null ? [] : [...fetched];
    const deletedIds = new Set(
      this.updateRequests.deleteProtectedRange
        .filter((operation) => operation.kind === "deleteProtectedRange")
        .filter((operation) => operation.sheetId === this.sheetGid)
        .map((operation) => operation.protectedRangeId),
    );
    const remaining = protections.filter(
      (protection) => !deletedIds.has(protection.id),
    );
    const queued = this.updateRequests.addProtectedRange
      .filter((operation) => operation.kind === "addProtectedRange")
      .filter(
        (operation) => operation.protection.range.sheetId === this.sheetGid,
      )
      .map((operation) => operation.protection);
    return [
      ...remaining.flatMap((protection) =>
        protection.kind === "unmodelable" ? [] : [protection],
      ),
      ...queued,
    ];
  }
  removeEditProtections(): this {
    return this.removeEditProtectionsAt(this.dataGridRange);
  }
  removeEditProtectionsAt(range: ProtectionGridRange): this {
    this._assertProtectionWriteCoordinatesNotStale(range, []);
    this.assertProtectedRangesNotStale();
    this.protectedRanges().forEach((protection) => {
      if (protection.kind === "unmodelable") return;
      if (!protectionRangeEqual(range, protection.range)) return;
      this._queueDeleteProtectedRange(protection.id);
    });
    return this;
  }
  removeEditProtection(protection: ProtectedRange): this {
    this.assertProtectedRangesNotStale();
    this.protectedRanges().forEach((existing) => {
      if (!protectedRangesEqual(existing, protection)) return;
      if (existing.kind !== "unmodelable") {
        this._assertProtectionWriteCoordinatesNotStale(
          existing.range,
          existing.unprotectedRanges,
        );
      }
      this._queueDeleteProtectedRange(existing.id);
    });
    return this;
  }
  removeEditProtectionByDescription(description: string): this {
    this.assertProtectedRangesNotStale();
    this.protectedRanges().forEach((existing) => {
      if (existing.kind === "unmodelable") return;
      if (existing.description !== description) return;
      this._assertProtectionWriteCoordinatesNotStale(
        existing.range,
        existing.unprotectedRanges,
      );
      this._queueDeleteProtectedRange(existing.id);
    });
    return this;
  }
  removeEditProtectionById(protectedRangeId: number): this {
    this.assertProtectedRangesNotStale();
    this.protectedRanges().forEach((existing) => {
      if (existing.id !== protectedRangeId) return;
      if (existing.kind !== "unmodelable") {
        this._assertProtectionWriteCoordinatesNotStale(
          existing.range,
          existing.unprotectedRanges,
        );
      }
      this._queueDeleteProtectedRange(existing.id);
    });
    return this;
  }
  private _queueDeleteProtectedRange(protectedRangeId: number): void {
    this.updateRequests.deleteProtectedRange.push({
      kind: "deleteProtectedRange",
      sheetId: this.sheetGid,
      protectedRangeId,
    });
  }
  private _assertProtectionWriteCoordinatesNotStale(
    range: ProtectionGridRange,
    unprotectedRanges: ProtectionGridRange[],
  ): void {
    [range, ...unprotectedRanges].forEach((item) => {
      this._assertOneProtectionRangeCoordinatesNotStale(item);
    });
  }
  private _assertOneProtectionRangeCoordinatesNotStale(
    range: ProtectionGridRange,
  ): void {
    if (isWholeColumnGridRange(range)) {
      if (this.sheetState.knownTable !== null) {
        this.activeTable.validateColIndexNotStale(range.startColumnIndex);
      }
      return;
    }
    if (!protectionRangeHasRowCoordinates(range)) return;
    this.activeTable.assertRowIndexesNotStale();
  }
  markProtectedRangesStale(): void {
    this.sheetState.protectedRangesAreStale = true;
  }
  assertProtectedRangesNotStale(): void {
    if (!this.sheetState.protectedRangesAreStale) return;
    throw new Error(
      `Protections are stale for sheetGid ${this.sheetGid}. Re-fetch the sheet's protections before reading or mutating them again.`,
    );
  }
  integrateProtectedRanges(protections: ProtectedRange[]): void {
    this.sheetState.protectedRanges = protections;
    this.sheetState.gatherProtectedRanges = false;
    this.sheetState.protectedRangesAreStale = false;
  }
  private _integrateSheetData(
    gridBlocks: NonNullable<SheetSnapshot["gridBlocks"]>,
  ): void {
    gridBlocks.forEach((block) => {
      const colIdxBase = block.startColumn;
      block.rows.forEach((rowSnapshot, rowIdxBase) => {
        const rowIndex = rowIdxBase + block.startRow;
        const row = this.rowCommon(rowIndex);
        row.ensureStateExists();
        for (
          let colIdxOffset = 0;
          colIdxOffset < block.columnCount;
          colIdxOffset++
        ) {
          const colIndex = colIdxBase + colIdxOffset;
          const cellData = rowSnapshot.cells[colIdxOffset];
          if (row.rowIsActive()) {
            row.cell(colIndex).integrateSnapshot(cellData);
          }
          if (
            rowIndex === this.schema.topDataRowIdx &&
            this.isTableColIndex(colIndex)
          ) {
            this.meta.column(colIndex).integrateActiveFacts(cellData);
          }
        }
      });
    });
  }
  // The uniform rows survive, or every later column-index resolution breaks.
  removeRowsExcept(...rowIdxesToKeep: number[]): void {
    const allRowIdxs = Array.from(this.rowStates.keys());
    allRowIdxs.forEach((rowIndex) => {
      if (this.schema.isUniformRowIndex(rowIndex)) return;
      if (!rowIdxesToKeep.includes(rowIndex)) {
        this.rowCommon(rowIndex).remove();
      }
    });
    this.sheetState.isPrunedToSelection = true;
  }
  // A whole-column fill ignores active rows, so it would rewrite what a prune excluded.
  validateNotPrunedToSelection(): void {
    if (this.sheetState.isPrunedToSelection) {
      throw new Error(
        `Sheet ${this.sheetGid} has been pruned to a selection. A whole-column write would reach the rows the prune excluded.`,
      );
    }
  }
  requestSortGSheet({ colIdxToSortBy, sortOrder }: SortParameters): void {
    this.addSheetChangeToSave({
      action: "sort",
      colIdxToSortBy,
      sortOrder,
    });
  }
  // Value/colour fills stay one repeatCell; a formula fill is pasteData so Sheets parses it.
  gatherFillRequest({
    colIndex,
    startRowIndex,
    endRowIndex,
    formula,
    ...change
  }: ColumnFill): void {
    assertValueAndFormulaExclusive(change.value, formula);
    this.updateRequests.fill.push({
      kind: "fill",
      sheetId: this.sheetGid,
      colIndex,
      startRowIndex,
      endRowIndex,
      ...change,
      ...(formula !== undefined ? { formula } : {}),
    });
  }
  gatherInsertColumnRequest(startColumnIndex: number): void {
    this.updateRequests.insertColumn.push({
      kind: "insertColumn",
      sheetId: this.sheetGid,
      startColumnIndex,
    });
    if (startColumnIndex === this.activeTable.endColumnIndex) {
      this.activeTable.growEndColumnIndex();
    } else {
      this.ensureColIndexIsStale(startColumnIndex);
    }
  }
  gatherSortRequest({ colIdxToSortBy, sortOrder }: SortParameters): void {
    this.updateRequests.sort.push({
      kind: "sort",
      sheetId: this.sheetGid,
      startRowIndex: this.schema.topDataRowIdx,
      startColumnIndex: 0,
      colIdxToSortBy,
      sortOrder,
    });
  }
  appendDataRow(): RowRaw {
    const idx = this.activeTable.endRowIndex;
    return this.row(idx).append();
  }
  appendDataRowValues(colValues: Map<number, Value>): RowRaw {
    const row = this.appendDataRow();
    for (const [colIndex, value] of colValues.entries()) {
      row.updateValue(colIndex, value);
    }
    return row;
  }
}
