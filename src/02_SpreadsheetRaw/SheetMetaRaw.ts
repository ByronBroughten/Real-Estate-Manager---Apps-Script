import { type CellValueName, type UniformRowName } from "../00_base/base";
import { Arr } from "../utils/Arr";
import { SheetCommonRaw } from "./ClassBases/SheetCommonRaw";
import { ColumnMetaRaw } from "./ColumnMetaRaw";
import { SheetRaw } from "./SheetRaw";
import { SpreadsheetRaw } from "./SpreadsheetRaw";
import { UniformRowRaw } from "./UniformRowRaw";

export class SheetMetaRaw extends SheetCommonRaw {
  get ss(): SpreadsheetRaw {
    return new SpreadsheetRaw(this.spreadsheetRawProps);
  }
  get primary(): SheetRaw {
    return new SheetRaw(this.sheetRawProps);
  }
  get hasFetchedColumnIds(): boolean {
    return this.sheetState.hasFetchedColumnIds;
  }
  get tableHeaderRow(): UniformRowRaw<"tableHeader"> {
    return this.uniformRow("tableHeader");
  }
  get actionRow(): UniformRowRaw<"action"> {
    return this.uniformRow("action");
  }
  get colIdRow(): UniformRowRaw<"columnId"> {
    return this.uniformRow("columnId");
  }
  get activeColumnIds(): string[] {
    return this._tableColumnIds().filter((columnId) => columnId !== "");
  }
  columnIdAt(colIndex: number): string {
    if (this.isTableColIndex(colIndex)) {
      return this._columnIdInTable(colIndex);
    }
    const value = this.colIdRow.valueOrEmpty(colIndex);
    return typeof value === "string" ? value : "";
  }
  uniformRow<UN extends UniformRowName>(uniformRowName: UN): UniformRowRaw<UN> {
    return new UniformRowRaw({
      ...this.sheetRawProps,
      uniformRowName,
    });
  }
  uniformRowByIndex(rowIndex: number): UniformRowRaw {
    return this.uniformRow(this.schema.uniformRowNameByIndex(rowIndex));
  }
  column<VN extends CellValueName = CellValueName>(
    colIndex: number,
  ): ColumnMetaRaw<VN> {
    return new ColumnMetaRaw<VN>({
      colIndex,
      ...this.sheetRawProps,
    });
  }
  columnByActiveId<VN extends CellValueName = CellValueName>(
    columnId: string,
  ): ColumnMetaRaw<VN> {
    return this.column<VN>(this.colIndexOfActiveColumnId(columnId));
  }
  isActiveColumnId(columnId: string): boolean {
    return this._tableColumnIds().includes(columnId);
  }
  colIndexOfActiveColumnId(columnId: string): number {
    const tableColIndexes = this._tableColIndexes();
    const colIndex = this._tableColumnIds().findIndex((id) => id === columnId);
    if (colIndex === -1) {
      throw new Error(
        `Value ${columnId} not found in row ${this.schema.colIdRowIndex}. Cannot find column index.`,
      );
    }
    return tableColIndexes[colIndex]!;
  }
  addMissingColumnIds(idPrefix: string): number {
    let addedCount = 0;
    this._tableColIndexes().forEach((colIndex) => {
      const colIdValue = this._columnIdInTable(colIndex);
      if (!colIdValue) {
        this.colIdRow.updateValue(colIndex, this.makeColumnId(idPrefix));
        addedCount++;
      }
    });
    return addedCount;
  }
  makeColumnId(idPrefix: string): string {
    return this.schema.makeColIdFromPrefix(idPrefix);
  }
  insertColumnAtEnd(props: { idPrefix: string; header: string }): number {
    const columnIndex = this.activeTable.endColumnIndex;
    this.column(columnIndex).initUniformCells(props);
    this.addSheetChangeToSave({
      action: "insertColumn",
      startColumnIndex: columnIndex,
    });
    return columnIndex;
  }
  // Only table columns: a fact is always reached through a column ID.
  ensureTableColumnsActiveFacts(): void {
    this.fullTableColIndexes.forEach((colIndex) => {
      this.column(colIndex).ensureActiveFacts();
    });
  }
  gatherFetchColumnIdsInit(startTableColIndex: number): this {
    this.gatherFetchRange({
      startRowIndex: this.schema.colIdRowIndex,
      endRowIndex: this.schema.colIdRowIndex + 1,
      startColumnIndex: startTableColIndex,
    });
    this.sheetState.rowIndexesToFinalize.add(this.schema.colIdRowIndex);
    return this;
  }
  private _columnIdInTable(colIndex: number): string {
    const value = this.colIdRow.valueOrEmpty(colIndex);
    if (value !== "" && typeof value !== "string") {
      throw new Error(
        `Column ID in ${this.sheetLabel} column index ${colIndex} must be text or blank, got ${JSON.stringify(value)}.`,
      );
    }
    return value;
  }
  private _tableColumnIds(): string[] {
    return this._tableColIndexes().map((colIndex) =>
      this._columnIdInTable(colIndex),
    );
  }
  private _tableColIndexes(): number[] {
    const table = this.sheetState.activeTable;
    if (table === null) {
      throw new Error(
        `Active table is null for sheetGid ${this.sheetGid}. Ensure that the sheet properties have been fetched.`,
      );
    }
    return Arr.indexesFromUntil(table.startColumnIndex, table.endColumnIndex);
  }
}
