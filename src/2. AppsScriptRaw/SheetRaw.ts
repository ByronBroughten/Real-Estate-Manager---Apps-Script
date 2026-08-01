import { SheetSchemaRaw } from "../1.1 SpreadsheetSchemaRaw/SheetSchemaRaw";
import { valS } from "../utils/validation";
import { SheetRawBase } from "./ClassBases/SheetRawBase";
import { RowRaw } from "./RowRaw";
import { SpreadsheetRaw } from "./SpreadsheetRaw";
import type {
  DataFilter,
  GoogleColCell,
  GoogleSheet,
  GoogleSheetData,
  GridRange,
} from "./Types/AppsScriptTypes";

interface MakeGetRequestProps {
  startRowIdxBase0: number;
  howManyRows: number;
  columnIdxsBase0: number;
  howManyColumns: number;
}

interface MakeGetRequestsProps {
  startRowIdxBase0: number;
  howManyRows: number;
  columnIdxsBase0: number[];
}

const test = {
  sheets: [
    {
      tables: [
        {
          tableId: "691006646",
          name: "allTableAttributes",
        },
      ],
      data: [
        {
          startColumn: 1,
          rowData: [
            {
              values: [
                {
                  formattedValue: "col-_NrBHfg",
                  effectiveValue: {
                    stringValue: "col-_NrBHfg",
                  },
                },
              ],
            },
            {
              values: [
                {
                  effectiveValue: {
                    stringValue: "Base ID",
                  },
                  formattedValue: "Base ID",
                },
              ],
            },
          ],
        },
      ],
    },
    {
      tables: [
        {
          name: "test",
          tableId: "1321948538",
        },
      ],
      data: [
        {
          startColumn: 2,
          rowData: [
            {
              values: [
                {
                  effectiveValue: {
                    stringValue: "Number",
                  },
                },
              ],
            },
            {
              values: [
                {
                  effectiveValue: {
                    numberValue: 4,
                  },
                },
              ],
            },
            {
              values: [
                {
                  effectiveValue: {
                    numberValue: 11,
                  },
                },
              ],
            },
            {
              values: [
                {
                  effectiveValue: {
                    numberValue: 12,
                  },
                },
              ],
            },
            {
              values: [
                {
                  effectiveValue: {
                    numberValue: 13,
                  },
                },
              ],
            },
            {
              values: [
                {
                  effectiveValue: {
                    numberValue: 11,
                  },
                },
              ],
            },
            {
              values: [
                {
                  effectiveValue: {
                    numberValue: 12,
                  },
                },
              ],
            },
            {
              values: [
                {
                  effectiveValue: {
                    numberValue: 13,
                  },
                },
              ],
            },
          ],
        },
        {
          startColumn: 4,
          rowData: [
            {
              values: [
                {
                  effectiveValue: {
                    stringValue: "Date",
                  },
                },
              ],
            },
            {
              values: [
                {
                  effectiveValue: {
                    numberValue: 46233,
                  },
                },
              ],
            },
            {
              values: [
                {
                  effectiveValue: {
                    numberValue: 46233,
                  },
                },
              ],
            },
            {
              values: [
                {
                  effectiveValue: {
                    numberValue: 46233,
                  },
                },
              ],
            },
            {
              values: [
                {
                  effectiveValue: {
                    numberValue: 46233,
                  },
                },
              ],
            },
            {
              values: [
                {
                  effectiveValue: {
                    numberValue: 46233,
                  },
                },
              ],
            },
            {
              values: [
                {
                  effectiveValue: {
                    numberValue: 46233,
                  },
                },
              ],
            },
            {
              values: [
                {
                  formattedValue: "7/30/2026",
                  effectiveValue: {
                    numberValue: 46233,
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

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
  get emptyGridRange(): GridRange {
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
      const colIdx = colData.startColumn;
      colData.rowData.forEach((colCell, rowIdx) => {
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
  makeGetRequest({
    startRowIdxBase0,
    howManyRows,
    columnIdxsBase0,
    howManyColumns,
  }: MakeGetRequestProps): DataFilter {
    return {
      gridRange: {
        sheetId: this.sheetGid,
        startRowIndex: startRowIdxBase0,
        endRowIndex: startRowIdxBase0 + howManyRows,
        startColumnIndex: columnIdxsBase0,
        endColumnIndex: columnIdxsBase0 + howManyColumns,
      },
    };
  }
  makeGetRequests({
    startRowIdxBase0,
    howManyRows,
    columnIdxsBase0,
  }: MakeGetRequestsProps): DataFilter[] {
    return columnIdxsBase0.map((columnIdxBase0) =>
      this.makeGetRequest({
        startRowIdxBase0,
        howManyRows,
        columnIdxsBase0: columnIdxBase0,
        howManyColumns: 1,
      }),
    );
  }
}
