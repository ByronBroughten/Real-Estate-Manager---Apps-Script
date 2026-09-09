import { type CellValueName, type UniformRowName } from "../00_base/base";
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
  get headerRow(): UniformRowRaw<"header"> {
    return this.uniformRow("header");
  }
  get actionRow(): UniformRowRaw<"action"> {
    return this.uniformRow("action");
  }
  get colIdRow(): UniformRowRaw<"columnId"> {
    return this.uniformRow("columnId");
  }
  get activeColumnIds(): string[] {
    return this.colIdRow.activeValueArr.filter((columnId) => columnId !== "");
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
    valueName?: VN,
  ): ColumnMetaRaw<VN> {
    return new ColumnMetaRaw({
      colIndex,
      valueName,
      ...this.sheetRawProps,
    });
  }
  columnByActiveId<VN extends CellValueName = CellValueName>(
    columnId: string,
    valueName?: VN,
  ): ColumnMetaRaw<VN> {
    const colIndex = this.colIdRow.colIndexOfValue(columnId);
    return this.column(colIndex, valueName);
  }
  isActiveColumnId(columnId: string): boolean {
    return this.colIdRow.hasValue(columnId);
  }
  addMissingColumnIds(idPrefix: string): number {
    let addedCount = 0;
    this.fullTableColIndexes.forEach((colIndex) => {
      const colIdValue = this.colIdRow.value(colIndex);
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
  gatherFetchColumnIds(): this {
    this.colIdRow.gatherFetchFull();
    return this;
  }
}
