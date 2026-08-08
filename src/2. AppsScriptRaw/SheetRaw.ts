import type { Value } from "../0. spreadsheetMetaData/3.2 valueAttributes";
import { SheetSchemaRaw } from "../1.1 SpreadsheetSchemaRaw/SheetSchemaRaw";
import { Obj, type StrictPickPartial } from "../utils/Obj";
import { valS } from "../utils/validation";
import { SheetRawBase } from "./ClassBases/SheetRawBase";
import { ColumnRaw } from "./ColumnRaw";
import { RowRaw } from "./RowRaw";
import { SpreadsheetRaw } from "./SpreadsheetRaw";
import type {
  GoogleCellValue,
  GoogleGridRange,
  GoogleSheet,
  GoogleSheetData,
} from "./Types/AppsScriptTypes";
import type {
  ColumnCount,
  GridRangeProps,
  RowCountRaw,
  SheetChangeProps,
  SheetChangePropsObj,
  SheetChangesToSave,
  SortParameters,
} from "./Types/RawState";

type GetGridRangeProps = {
  startRowIndex: number;
  rowCount: RowCountRaw;
  startColumnIndex: number;
  columnCount: ColumnCount;
};

interface MakeGetRequestProps {
  rowCount: RowCountRaw;
  startRowIndex?: number;
  startColumnIndex?: number;
  columnCount?: ColumnCount;
}

interface MakeGetRequestsProps {
  startRowIndex: number;
  endRowIndex?: number;
  startColumnIndexes: number[];
}

export class SheetRaw extends SheetRawBase {
  get spreadsheet(): SpreadsheetRaw {
    return new SpreadsheetRaw(this.spreadsheetRawProps);
  }
  get schema(): SheetSchemaRaw {
    return new SheetSchemaRaw(this.sheetGid);
  }
  row(rowIdx: number): RowRaw {
    return new RowRaw({
      idxBase0: rowIdx,
      ...this.sheetRawProps,
    });
  }
  column(columnIdx: number): ColumnRaw {
    return new ColumnRaw({
      columnIdx,
      ...this.sheetRawProps,
    });
  }
  get topDataRow(): RowRaw {
    return this.row(this.schema.topDataRowIdx);
  }
  get headerRow(): RowRaw {
    return this.row(this.schema.headerRowIdx);
  }
  get actionRow(): RowRaw {
    return this.row(this.schema.actionRowIdx);
  }
  get colIdRow(): RowRaw {
    return this.row(this.schema.colIdRowIdx);
  }
  get activeRows(): RowRaw[] {
    return Array.from(this.sheetState.rowStates.keys()).map((idxBase0) =>
      this.row(idxBase0),
    );
  }
  get dataRows(): RowRaw[] {
    return this.activeRows.filter(
      (row) => row.idxBase0 >= this.schema.topDataRowIdx,
    );
  }
  get activeColumnIdxs(): number[] {
    return this.activeRows[0].activeColIdxs;
  }
  get activeRowIndexes(): number[] {
    return Array.from(this.sheetState.rowStates.keys());
  }
  get emptyGridRange(): GoogleGridRange {
    return { sheetId: this.sheetGid, startRowIndex: 0, endRowIndex: 0 };
  }
  integrateSheetState(sheet: GoogleSheet): void {
    this._initSheetState(sheet);
    if (sheet.data) {
      this._integrateSheetRowStates(sheet.data);
    }
  }
  private _initSheetState(sheet: GoogleSheet): void {
    const properties = sheet.properties;
    const table = sheet.tables[0];
    const tableRange = Obj.validatePick(
      table.range,
      "number",
      "startRowIndex",
      "endRowIndex",
      "startColumnIndex",
      "endColumnIndex",
    );

    this.sheetsState.set(this.sheetGid, {
      title: valS.assertDefined(properties.title, "sheet title "),
      sheetName: valS.assertDefined(table.name, "sheetName"),
      activeTable: {
        tableId: valS.assertDefined(table.tableId, "tableId"),
        ...tableRange,
      },
      rowIndexesAreValid: true,
      lastNotStaleColumnIdx: null,
      rowStates: new Map(),
    });
  }
  private _integrateSheetRowStates(sheetData: GoogleSheetData): void {
    const colsData = valS.assertDefined(sheetData, "sheetData");
    colsData.forEach((colData) => {
      const colIdxBase = valS.assertDefined(
        colData.startColumn,
        "colData.startColumn",
      );
      const columns = colData.columnMetadata || [];
      colData.rowData.forEach((colCell, rowIdxBase) => {
        columns.forEach((_, colIdxOffset) => {
          const colIdx = colIdxBase + colIdxOffset;
          const rowIdx = rowIdxBase + colData.startRow;
          const cellData = colCell?.values?.[colIdxOffset] as
            | GoogleCellValue
            | undefined;
          this.row(rowIdx).integrateState(colIdx, cellData);
        });
      });
    });
  }
  addMissingColumnIds(): void {
    const colIdRow = this.row(this.schema.colIdRowIdx);
    this.activeColumnIdxs.forEach((colIdx) => {
      const colIdValue = colIdRow.value(colIdx);
      if (!colIdValue) {
        colIdRow.setValue(colIdx, this.schema.makeColumnId());
      }
    });
  }
  wholeRowGridRange(rowIndex: number): GridRangeProps {
    return {
      sheetId: this.sheetGid,
      ...this.spreadsheet.schema.oneRowSpecifier(rowIndex),
      startColumnIndex: 0,
      endColumnIndex: this.activeTable.endColumnIndex,
    };
  }
  gatherGetRequests(props: GridRangeProps[]): void {
    props.forEach((props) => {
      this.rawState.getterGridRanges.push({
        sheetId: this.sheetGid,
        ...props,
      });
    });
  }
  verifyColumnIds() {
    const row = this.row(this.schema.colIdRowIdx);
    row.validateIsActive();

    const activeColIdxs = row.activeColIdxs;
    if (!activeColIdxs.length) {
      throw new Error(
        `Column ID row state not found for sheet ${this.sheetGid}. Cannot verify column IDs.`,
      );
    }
    activeColIdxs.forEach((colIdx) => {
      this._verifyColumnId(colIdx);
    });
  }
  private _verifyColumnId(colIdx: number): void {
    const colSchema = this.schema.column(colIdx);
    const colIdInSchema = colSchema.attribute("columnId");

    const colIdRow = this.row(this.schema.colIdRowIdx);
    const colIdValue = colIdRow.value(colIdx);
    if (colIdValue !== colIdInSchema) {
      throw new Error(
        `colIdValue is "${colIdValue}" but expected "${colIdInSchema}". Are all the column ids and indexes up to date?`,
      );
    }
  }

  getGridRangeIndexes({
    // This is to ensure that all meta data is obtained even when no data rows are requested.
    startRowIndex,
    rowCount,
    startColumnIndex,
    columnCount,
  }: GetGridRangeProps): StrictPickPartial<
    GoogleGridRange,
    "startRowIndex" | "endRowIndex" | "startColumnIndex" | "endColumnIndex"
  > {
    const minimumEndRowIndex = this.schema.topDataRowIdx;
    if (rowCount === "allFromStart") {
      if (columnCount === "allFromStart") {
        return { startRowIndex, startColumnIndex };
      } else {
        return {
          startRowIndex,
          startColumnIndex,
          endColumnIndex: startColumnIndex + columnCount,
        };
      }
    } else if (rowCount === 0) {
      return {
        startRowIndex,
        startColumnIndex,
        endColumnIndex: startColumnIndex,
      };
    } else {
      if (columnCount === "allFromStart") {
        return {
          startRowIndex,
          endRowIndex: startRowIndex + rowCount,
          startColumnIndex,
        };
      } else {
        return {
          startRowIndex,
          endRowIndex: startRowIndex + rowCount,
          startColumnIndex,
          endColumnIndex: startColumnIndex + columnCount,
        };
      }
    }
  }
  get lastRowIdx(): number {
    return Math.max(...this.sheetState.rowStates.keys());
  }
  invalidateRowIndexes(): void {
    this.sheetState.rowIndexesAreValid = false;
  }
  validateRowIndexes(): void {
    this.sheetState.rowIndexesAreValid = true;
  }
  appendRow(): RowRaw {
    const idx = this.activeTable.endRowIndex;
    this.sheetState.rowStates[idx] = new Map();
    this.activeTable.endRowIndex++;
    return this.row(idx)._addChangeToSave({ action: "append" });
  }
  appendRowDefault(): RowRaw {
    return this.appendRow().setDataRowToDefault(
      ...this.topDataRow.activeColIdxsNotFormula,
    );
  }
  appendRowAndValues(colValues: Map<number, Value>): RowRaw {
    const row = this.appendRowDefault();
    for (const [colIdx, value] of colValues.entries()) {
      row.setValue(colIdx, value);
    }
    return row;
  }
  DELETE_ACTIVE_ROWS(
    startRowIdx: number,
    numRows: number = this.rowCount - startRowIdx,
  ): SheetRaw {
    this.sheetState.rowStates
      .entries()
      .filter(
        ([rowIdx]) => rowIdx >= startRowIdx && rowIdx < startRowIdx + numRows,
      )
      .forEach(([rowIdx]) => {
        const row = this.row(rowIdx);
        row.delete();
      });
    return this;
  }
  removeRowsExcept(...rowIdxesToKeep: number[]): void {
    const allRowIdxs = Array.from(this.sheetState.rowStates.keys());
    allRowIdxs.forEach((rowIdx) => {
      if (!rowIdxesToKeep.includes(rowIdx)) {
        this.row(rowIdx).remove();
      }
    });
  }
  get changesToSave(): SheetChangesToSave {
    this._ensureChnagesToSaveExists();
    return this.allChangesToSave.get(this.sheetGid) as SheetChangesToSave;
  }
  private _ensureChnagesToSaveExists(): void {
    const sheetChangesToSave = this.rawState.changesToSave;
    const sheetGid = this.sheetGid;
    if (!sheetChangesToSave.has(sheetGid)) {
      sheetChangesToSave.set(sheetGid, {
        level: "sheet",
        sort: null,
        insertColumn: null,
      });
    }
  }
  requestSortGSheet({ colIdxToSortBy, sortOrder }: SortParameters): void {
    this._addChangeToSave({
      action: "sort",
      colIdxToSortBy,
      sortOrder,
    });
  }
  _addChangeToSave(props: SheetChangeProps): SheetRaw {
    const changes = this.changesToSave;
    const actions: {
      [K in keyof SheetChangePropsObj]: (props: SheetChangePropsObj[K]) => any;
    } = {
      sort: (props) =>
        (changes.sort = {
          colIdxToSortBy: props.colIdxToSortBy,
          sortOrder: props.sortOrder,
        }),
      insertColumn: (props) => (changes.insertColumn = props.startColumnIndex),
    };
    switch (props.action) {
      case "sort":
        actions.sort(props);
        break;
      case "insertColumn":
        actions.insertColumn(props);
        break;
      default:
        throw new Error(
          `Invalid action: ${(props as SheetChangeProps).action}. Must be one of "sort" or "insertColumn".`,
        );
    }
    return this;
  }
  insertColumnAt(startColumnIndex: number = 0): void {
    this._addChangeToSave({
      action: "insertColumn",
      startColumnIndex,
    });
  }
  gatherInsertColumnRequest(startColumnIndex: number): void {
    this.updateRequests.insertColumn.push({
      insertDimension: {
        range: {
          sheetId: this.sheetGid,
          dimension: "COLUMNS",
          startIndex: startColumnIndex,
          endIndex: startColumnIndex + 1,
        },
        inheritFromBefore: false, // Let the formatting and column header colors be natural.
      },
    });
    if (this.sheetState.lastNotStaleColumnIdx !== null) {
      if (this.sheetState.lastNotStaleColumnIdx > startColumnIndex) {
        this.sheetState.lastNotStaleColumnIdx = startColumnIndex;
      }
    }
  }
  gatherSortRequest({ colIdxToSortBy, sortOrder }: SortParameters): void {
    this.updateRequests.sort.push({
      sortRange: {
        range: {
          sheetId: this.sheetGid,
          startRowIndex: this.schema.topDataRowIdx,
          startColumnIndex: 0,
        }, // skip header, unbounded end = rest of sheet
        sortSpecs: [{ dimensionIndex: colIdxToSortBy, sortOrder }],
      },
    });
  }
}
