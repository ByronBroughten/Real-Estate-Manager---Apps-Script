import { SheetSchemaRaw } from "../1.1 SpreadsheetSchemaRaw/SheetSchemaRaw";
import type { StrictPickPartial } from "../utils/Obj";
import { valS } from "../utils/validation";
import { SheetRawBase } from "./ClassBases/SheetRawBase";
import { RowRaw } from "./RowRaw";
import { SpreadsheetRaw } from "./SpreadsheetRaw";
import type {
  GoogleColCell,
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
      rowStates: new Map(),
      rowIndexesAreValid: true,
    });
    this._initSheetRowStates(sheet.data);
  }
  private _initSheetRowStates(sheetData: GoogleSheetData | undefined): void {
    // I kind of want to store row data as zero-indexed.

    const colsData = valS.assertDefined(sheetData, "sheetData");
    const { colIdRowIdx, topBodyRowIdx } = this.schema;
    colsData.forEach((colData) => {
      // what about when I do all columns?
      const colIdx = colData.startColumn;
      colData.rowData.forEach((colCell, rowIdxBase) => {
        const rowIdx = rowIdxBase + colData.startRow;
        if (rowIdx === colIdRowIdx) {
          this.verifyColumnId(colIdx, colCell);
        } else if (rowIdx >= topBodyRowIdx) {
          this.row(rowIdx).initState(colIdx, colCell);
        }
      });
    });
  }
  verifyColumnId(colIdx: number, colCell: GoogleColCell): void {
    const colSchema = this.schema.column(colIdx);
    const value = colSchema.extractCellValue(colCell);
    const columnId = colSchema.attribute("columnId");
    if (value !== columnId) {
      throw new Error(
        `value is "${value}" but expected "${columnId}". Are all the column ids and indexes up to date?`,
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
    // The purpose of this is to ensure that all meta data is obtained even when no data rows are requested.
    // All meta data and no data rows: columnStartIndex = columnEndIndex without a row end index
    // Lacking table meta data but get the rest: rowStartIndex = rowEndIndex, or columnStartIndex = columnEndIndex with row indices
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
}
