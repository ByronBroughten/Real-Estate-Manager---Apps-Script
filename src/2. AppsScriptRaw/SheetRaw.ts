import { SheetSchemaRaw } from "../1.1 SpreadsheetSchemaRaw/SheetSchemaRaw";
import type { StrictPickPartial } from "../utils/Obj";
import { valS } from "../utils/validation";
import { SheetRawBase } from "./ClassBases/SheetRawBase";
import { RowRaw } from "./RowRaw";
import { SpreadsheetRaw } from "./SpreadsheetRaw";
import type {
  GoogleCellValue,
  GoogleGridRange,
  GoogleSheet,
  GoogleSheetData,
} from "./Types/AppsScriptTypes";

export type RowCount = number | "allFromStart";
export type ColumnCount = number | "allFromStart";

type GetGridRangeProps = {
  startRowIndex: number;
  rowCount: RowCount;
  startColumnIndex: number;
  columnCount: ColumnCount;
};

interface MakeGetRequestProps {
  rowCount: RowCount;
  startRowIndex?: number;
  startColumnIndex?: number;
  columnCount?: ColumnCount;
}

interface MakeGetRequestsProps {
  startRowIndex: number;
  rowCount: RowCount;
  startColumnIndexes: number[];
}

export class SheetRaw extends SheetRawBase {
  get spreadsheet(): SpreadsheetRaw {
    return new SpreadsheetRaw(this.spreadsheetRawProps);
  }
  get schema(): SheetSchemaRaw {
    return new SheetSchemaRaw(this.sheetGid);
  }
  row(idxBase0: number): RowRaw {
    return new RowRaw({
      idxBase0,
      ...this.sheetRawProps,
    });
  }
  get topBodyRow(): RowRaw {
    return this.row(this.schema.topBodyRowIdx);
  }
  get allRows(): RowRaw[] {
    return Array.from(this.sheetState.rowStates.keys()).map((idxBase0) =>
      this.row(idxBase0),
    );
  }
  get dataRows(): RowRaw[] {
    return this.allRows.filter(
      (row) => row.idxBase0 >= this.schema.topBodyRowIdx,
    );
  }
  activeColumnIdxs(): number[] {
    const colIdRow = this.row(this.schema.colIdRowIdx);
    return colIdRow.activeColIdxs;
  }
  get emptyGridRange(): GoogleGridRange {
    return { sheetId: this.sheetGid, startRowIndex: 0, endRowIndex: 0 };
  }
  initSheetState(sheet: GoogleSheet): void {
    const properties = sheet.properties;
    const table = sheet.tables[0];
    this.sheetsState.set(this.sheetGid, {
      title: valS.assertDefined(properties.title, "sheet title "),
      tableName: valS.assertDefined(table.name, "tableName"),
      tableId: valS.assertDefined(table.tableId, "tableId"),
      rowIndexesAreValid: true,
      rowStates: new Map(),
    });
    if (sheet.data) {
      this._initSheetRowStates(sheet.data);
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
    rowCount,
    startRowIndex = 0,
    startColumnIndexes,
  }: MakeGetRequestsProps): void {
    startColumnIndexes.map((startColumnIndex) =>
      this.gatherGetRequest({
        rowCount,
        startRowIndex,
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
  appendRowDefault(): RowRaw {
    const idx = this.lastRowIdx + 1;
    this.sheetState.rowStates[this.lastRowIdx + 1] = new Map();
    return this.row(idx)
      .resetToDefault()
      ._addChangeToSave({ action: "append" });
  }
  appendRow() {
    this.appendRowDefault();
    // logic about props to give the row
  }
}
