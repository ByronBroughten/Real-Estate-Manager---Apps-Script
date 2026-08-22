import type { CellValue, UniformRowName } from "../00_base/base";
import { SheetRaw } from "../02_SpreadsheetRaw/SheetRaw";
import type { UniformRow } from "../02_SpreadsheetRaw/UniformRow";
import type { SheetName } from "../01_generatedConfigs/sheetConfigsTypes";
import { Arr } from "../utils/Arr";
import { isPreFetchType } from "./ClassTypes/IndexedState";
import { ColumnIndexed } from "./ColumnIndexed";
import { DataRowIndexed } from "./DataRowIndexed";
import { SheetIndexedBase } from "./SheetIndexedBase";
import { SheetSchemaIndexed } from "./SheetSchemaIndexed";

export class SheetIndexed extends SheetIndexedBase {
  get schema(): SheetSchemaIndexed {
    return new SheetSchemaIndexed(this.sheetGid);
  }
  colSchema(columnId: string): ColumnIndexed {
    return this.column(columnId);
  }
  get raw(): SheetRaw {
    return new SheetRaw(this.sheetIndexedProps);
  }
  get sheetName(): SheetName {
    return this.schema.sheetName;
  }
  column(columnId: string): ColumnIndexed {
    return new ColumnIndexed({
      ...this.sheetIndexedProps,
      columnId,
    });
  }
  columnIdByIndex(colIndex: number): string {
    return this.raw.colIdRow.uniformValue(colIndex);
  }
  uniformRow<UN extends UniformRowName>(rowName: UN): UniformRow<UN> {
    return this.raw.uniformRow(rowName);
  }
  dataRow(rowIndex: number): DataRowIndexed {
    return new DataRowIndexed({
      ...this.sheetIndexedProps,
      rowIndex,
    });
  }
  get dataRows() {
    return this.raw.dataRows.map((row) => this.dataRow(row.rowIndex));
  }
  get topDataRow(): DataRowIndexed {
    return this.dataRow(this.schema.topDataRowIdx);
  }
  get dataRowCount(): number {
    return this.raw.dataRowCount;
  }
  get fullDataRowIndexes(): number[] {
    return Arr.indexesFromUntil(
      this.ssSchema.topDataRowIdx,
      this.raw.activeTable.endRowIndex,
    );
  }
  fetchOnlyColumnIds(): this {
    this.raw.gatherFetchAllColumnIds();
    this.raw.ss.fetchAllPrepped();
    return this;
  }
  gatherDataPrerequisites() {
    this.raw.gatherFetchProperties();
    this.raw.gatherFetchAllColumnIds();
  }
  prepFetchFullUniformRow<UN extends UniformRowName>(rowName: UN) {
    const rowIndex = this.schema.uniformRowIndex(rowName);
    this.prepFetchFullRow(rowIndex);
  }
  prepFetchUniformRows<UN extends UniformRowName>(rowNames: UN[]) {
    rowNames.forEach((rowName) => this.prepFetchFullUniformRow(rowName));
  }
  prepFetchFullRow(rowIndex: number) {
    this.sheetState.indexesOfFullRowsToFetch.add(rowIndex);
    this.preFetchGridRanges.push({ row: rowIndex, column: "allDataColumns" });
  }
  prepFetchFullDataColumn(columnId: string) {
    this.sheetState.idsOfFullDataColsToFetch.add(columnId);
    this.preFetchGridRanges.push({ row: "allDataRows", column: columnId });
  }
  prepFetchSingleCell(rowIndex: number, columnId: string) {
    this.preFetchGridRanges.push({ row: rowIndex, column: columnId });
  }
  gatherFetchDataPrepped() {
    this.preFetchGridRanges.forEach((pf) => {
      if (isPreFetchType(pf, "fullRow")) {
        this.raw.row(pf.row).gatherFetchFull();
      } else if (isPreFetchType(pf, "fullDataColumn")) {
        this.column(pf.column).raw.data.gatherFetchAll();
      } else if (isPreFetchType(pf, "singleCell")) {
        const colIndex = this.column(pf.column).colIndex;
        this.raw.row(pf.row).cell(colIndex).gatherFetchRange();
      } else {
        throw new Error(`Unknown pre-fetch type: ${pf}`);
      }
    });
  }
  finalizeFetchedData() {
    this._finalizeFetchedFullRows();
    this._finalizeFetchedFullDataColumns();
  }
  private _finalizeFetchedFullRows(): void {
    this.sheetState.indexesOfFullRowsToFetch.forEach((rowIndex) => {
      this.raw.row(rowIndex).ensureFullActiveDataCells();
    });
    this.sheetState.indexesOfFullRowsToFetch.clear();
  }
  private _finalizeFetchedFullDataColumns(): void {
    this.raw.dataRowsFull.forEach((row) => row.ensureStateExists());
    this.sheetState.idsOfFullDataColsToFetch.forEach((columnId) => {
      this.column(columnId).ensureFullActiveDataCells();
    });
    this.sheetState.idsOfFullDataColsToFetch.clear();
  }
  appendRowDefault(): DataRowIndexed {
    const defaultValues = this.schema.nonFormulaColumnIds.reduce(
      (acc, columnId) => {
        const colIndex = this.column(columnId).colIndex;
        const colSchema = this.schema.column(columnId);
        const defaultValue = colSchema.makeDefaultDataValue();
        acc.set(colIndex, defaultValue);
        return acc;
      },
      new Map() as Map<number, CellValue>,
    );
    const { rowIndex } = this.raw.appendDataRowValues(defaultValues);
    return this.dataRow(rowIndex);
  }
}
