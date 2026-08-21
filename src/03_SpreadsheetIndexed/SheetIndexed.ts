import type { UniformRowName } from "../00_base/base";
import { SheetRaw } from "../01_SpreadsheetRaw/SheetRaw";
import type { UniformRow } from "../01_SpreadsheetRaw/UniformRow";
import type { SheetName } from "../02_generatedTraits/02_sheetTraitsTypes";
import { isPreFetchType } from "./ClassTypes/IndexedState";
import { ColumnIndexed } from "./ColumnIndexed";
import { DataRowIndexed } from "./DataRowIndexed";
import { SheetIndexedBase } from "./SheetIndexedBase";
import { SheetSchemaIndexed } from "./SheetSchemaIndexed";

export class SheetIndexed extends SheetIndexedBase {
  get schema(): SheetSchemaIndexed {
    return new SheetSchemaIndexed(this.sheetGid);
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
  uniformRow<UN extends UniformRowName>(rowName: UN): UniformRow<UN> {
    return this.raw.uniformRow(rowName);
  }
  get topDataRow(): DataRowIndexed {
    return this.dataRow(this.schema.topDataRowIdx);
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
  gatherFetchGridRangesFromColIds() {
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
    this.raw.allDataRows.forEach((row) => row.ensureStateExists());
    this._finalizeFetchedFullRows();
    this._finalizeFetchedDataColumns();
  }
  private _finalizeFetchedFullRows(): void {
    this.sheetState.indexesOfFullRowsToFetch.forEach((rowIndex) => {
      this.fullDataColIndexes.forEach((colIndex) => {
        const row = this.row(rowIndex);
        if (!row.hasValue(colIndex)) {
          row.integrateEmptyState(colIndex);
        }
      });
    });
    this.sheetState.indexesOfFullRowsToFetch.clear();
  }
  private _finalizeFetchedDataColumns(): void {
    this.sheetState.indexesOfColDataToFetch.forEach((colIndex) => {
      this.allDataRows.forEach((row) => {
        if (!row.hasValue(colIndex)) {
          row.integrateEmptyState(colIndex);
        }
      });
    });
    this.sheetState.indexesOfColDataToFetch.clear();
  }

  appendRowDefault(): DataRowIndexed {
    const defaultValues = this.schema.defaultValues([
      ...this.schema.colIndexes,
    ]);
    const { rowIndex } = this.raw.appendDataRowValues(defaultValues);
    return this.dataRow(rowIndex);
  }
}
