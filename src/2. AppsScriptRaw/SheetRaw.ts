import type { Value } from "../0. spreadsheetMetaData/3.2 valueAttributes";
import { SheetSchemaRaw } from "../1.1 SpreadsheetSchemaRaw/SheetSchemaRaw";
import type { StrictPickPartial } from "../utils/Obj";
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
  GoogleUpdateRequest,
} from "./Types/AppsScriptTypes";
import type {
  ColumnCount,
  RowCountRaw,
  SheetChangeProps,
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
  rowCount: RowCountRaw;
  startRowIndex: number;
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
  get allRows(): RowRaw[] {
    return Array.from(this.sheetState.rowStates.keys()).map((idxBase0) =>
      this.row(idxBase0),
    );
  }
  get dataRows(): RowRaw[] {
    return this.allRows.filter(
      (row) => row.idxBase0 >= this.schema.topDataRowIdx,
    );
  }
  activeColumnIdxs(): number[] {
    const colIdRow = this.row(this.schema.colIdRowIdx);
    return colIdRow.activeColIdxs;
  }
  get activeRowIndexes(): number[] {
    return Array.from(this.sheetState.rowStates.keys());
  }
  get emptyGridRange(): GoogleGridRange {
    return { sheetId: this.sheetGid, startRowIndex: 0, endRowIndex: 0 };
  }
  initSheetState(sheet: GoogleSheet): void {
    const properties = sheet.properties;
    const table = sheet.tables[0];
    this.sheetsState.set(this.sheetGid, {
      title: valS.assertDefined(properties.title, "sheet title "),
      sheetName: valS.assertDefined(table.name, "sheetName"),
      tableId: valS.assertDefined(table.tableId, "tableId"),
      rowIndexesAreValid: true,
      nextAppendedRowIdx: 0,
      rowStates: new Map(),
    });
    if (sheet.data) {
      this._initSheetRowStates(sheet.data);
      this.sheetState.nextAppendedRowIdx = this.lastRowIdx + 1;
    }
  }
  private _initSheetRowStates(sheetData: GoogleSheetData): void {
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
          this.row(rowIdx).initState(colIdx, cellData);
        });
      });
    });
  }
  verifyColumnIds() {
    // How should I handle when a raw row's state is missing?
    const row = this.row(this.schema.colIdRowIdx);
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
  gatherGetRequest({
    rowCount,
    columnCount = 1,
    startRowIndex = 0,
    startColumnIndex = 0,
  }: MakeGetRequestProps): void {
    this.rawState.getterGridRanges.push({
      sheetId: this.sheetGid,
      ...this.getGridRangeIndexes({
        rowCount,
        columnCount,
        startRowIndex,
        startColumnIndex,
      }),
    });
  }
  gatherGetRequests({
    startRowIndex = 0,
    rowCount,
    startColumnIndexes,
  }: MakeGetRequestsProps): void {
    startColumnIndexes.map((startColumnIndex) =>
      this.gatherGetRequest({
        startRowIndex,
        rowCount,
        startColumnIndex,
        columnCount: 1,
      }),
    );
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
  appendRowDefault(): RowRaw {
    const idx = this.nextAppendedRowIdx;
    this.sheetState.rowStates[idx] = new Map();
    this.sheetState.nextAppendedRowIdx = idx + 1;
    return this.row(idx)
      .resetToDefault()
      ._addChangeToSave({ action: "append" });
  }
  appendRow(colValues: Map<number, Value>): RowRaw {
    const row = this.appendRowDefault();
    for (const [colIdx, value] of colValues.entries()) {
      row.setValue(colIdx, value);
    }
    return row;
  }
  DELETE_ROWS(
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
    const actions = {
      sort: (props: SheetChangeProps) =>
        (changes.sort = {
          colIdxToSortBy: props.colIdxToSortBy,
          sortOrder: props.sortOrder,
        }),
    };
    actions[props.action](props);
    return this;
  }
  sortRequest({
    colIdxToSortBy,
    sortOrder,
  }: SortParameters): GoogleUpdateRequest {
    return {
      sortRange: {
        range: {
          sheetId: this.sheetGid,
          startRowIndex: this.schema.topDataRowIdx,
          startColumnIndex: 0,
        }, // skip header, unbounded end = rest of sheet
        sortSpecs: [{ dimensionIndex: colIdxToSortBy, sortOrder }],
      },
    };
  }
  reduceActiveRows(...rowIdxesToKeep: number[]): void {
    const allRowIdxs = Array.from(this.sheetState.rowStates.keys());
    allRowIdxs.forEach((rowIdx) => {
      if (!rowIdxesToKeep.includes(rowIdx)) {
        this.row(rowIdx).remove();
      }
    });
  }
}
