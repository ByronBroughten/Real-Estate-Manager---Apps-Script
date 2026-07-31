import { spreadsheetConfig } from "../0. spreadsheetMetaData/1. spreadsheetConfig";
import { SpreadsheetSchema } from "../1. SpreadsheetSchema/SpreadsheetSchema";
import { valS } from "../utils/validation";
import { SpreadsheetRawBase } from "./ClassBases/SpreadsheetRawBase";
import { SheetRaw } from "./SheetRaw";
import type {
  BatchUpdateRequest,
  GetByDataFilterRequest,
  GoogleSheet,
  GoogleSheetData,
  GoogleSpreadsheet,
  GridRange,
} from "./Types/AppsScriptTypes";
import type { RawRowData } from "./Types/RawState";

type RowCount = number | "all";
type SheetId = number;
type ColumnIdx = number;
type SheetReq = Map<SheetId, ColumnIdx[]>;
type ReqSheetsProps = Map<RowCount, SheetReq>;

export class SpreadsheetRaw extends SpreadsheetRawBase {
  get headerRowIdxBase1(): number {
    return spreadsheetConfig.headerRowIdxBase1;
  }
  get spreadsheetId(): string {
    return this.gss.getId();
  }
  private _getByDataFilter(request: GetByDataFilterRequest): GoogleSpreadsheet {
    return Sheets.Spreadsheets.getByDataFilter(request, this.spreadsheetId, {
      fields:
        "sheets(properties(sheetId,title),tables(name,tableId),data(startColumn,rowData(values(formattedValue))))",
    });
  }
  initSheets(props: ReqSheetsProps) {
    const gridRanges = this._makeGridRanges(props);
    const data = this._getByDataFilter({
      dataFilters: gridRanges.map((gr) => ({
        gridRange: gr,
      })),
    });
    this._addDataToState(data);
  }
  private _makeGridRanges(props: ReqSheetsProps): GridRange[] {
    return props.keys().reduce((gridRange, rowCount) => {
      const sheets = props[rowCount] as SheetReq;
      sheets.keys().forEach((sheetId) => {
        const colIdxes = sheets.get(sheetId);
        colIdxes.forEach((colIdx) => {
          gridRange.push(
            this._makeGridRange({
              rowCount,
              sheetId,
              colIdx,
            }),
          );
        });
      });
      return gridRange;
    }, [] as GridRange[]);
  }
  private _makeGridRange({
    rowCount,
    sheetId,
    colIdx,
  }: {
    rowCount: RowCount;
    sheetId: number;
    colIdx: number;
  }): GridRange {
    return {
      sheetId: sheetId,
      startColumnIndex: colIdx,
      endColumnIndex: colIdx + 1,
      startRowIndex: this.configGet("columnIdRowIdxBase0"),
      ...(rowCount === "all"
        ? {}
        : {
            endRowIndex: this.configGet("topBodyRowIdxBase0") + rowCount,
          }),
    };
  }
  private _addDataToState(gss: GoogleSpreadsheet) {
    gss.sheets.forEach((sheet) => {
      this._initSheetState(sheet);
    });
  }
  get schema() {
    return new SpreadsheetSchema();
  }
  private _initSheetState(sheet: GoogleSheet): void {
    sheet.data[0].rowData[0].values;

    const properties = sheet.properties;
    const table = sheet.tables[0];
    const sheetId = valS.assertDefined(properties.sheetId, "sheetId");
    this.sheetsState.set(sheetId, {
      title: valS.assertDefined(properties.title, "sheet title "),
      tableName: valS.assertDefined(table.name, "tableName"),
      tableId: valS.assertDefined(table.tableId, "tableId"),
      rowData: this._initSheetRowData(sheetId, sheet.data),
      rowIndexesAreValid: true,
    });
  }
  private _initSheetRowData(
    sheetId: number,
    sheetData: GoogleSheetData | undefined,
  ): RawRowData {
    const colsData = valS.assertDefined(sheetData, "sheetData");

    const topFetchIdx = this.schema.configGet("topFetchRowIdxBase0");
    const columnIdIdx = this.schema.configGet("columnIdRowIdxBase0");
    const topBodyIdx = this.schema.configGet("topBodyRowIdxBase0");
    if (columnIdIdx < topFetchIdx) {
      throw new Error(
        "Column index is not fetched; column cannot be verified.",
      );
    }
    const fetchedColIdIdx = columnIdIdx - topFetchIdx;
    const fetchedBodyStartIdx = topBodyIdx - topFetchIdx;

    return colsData.reduce((rowData, colData) => {
      const colIdx = colData.startColumn;
      colData.rowData.forEach((colCell, rowIdx) => {
        if (rowIdx === fetchedColIdIdx) {
          const value = this._colCellValue(colCell, "stringValue");
          const { columnId } = this.schema
            .sheetByGid(sheetId)
            .colByIdx(colIdx).colId;
          if (value !== columnId) {
            throw new Error();
          }
        }
        if (rowIdx >= fetchedBodyStartIdx) {
          const value = this._colCellValue(colCell, sheetId, colIdx);

          // add this way if not exists, hmmm.
          rowData.set(rowIdx, new Map().set(colIdx, value));
        }
      });
      return rowData;
    }, new Map() as RawRowData);

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
  }
  private _colCellValue(colCell: GoogleAppsScript.Sheets.Schema.RowData): any {
    // Here I'll need more logic
    return valS.assertDefined(
      colCell.values[0].effectiveValue.stringValue,
      "colId",
    );
  }
  sheet(sheetGid: number): SheetRaw {
    return new SheetRaw({
      rawState: this.rawState,
      gid: sheetGid,
    });
  }
  deleteRowUnderConstruction() {}
  appendRange(roughRange: string, rawRows: any[][]) {
    // depreciated
    Sheets.Spreadsheets?.Values?.append(
      {
        values: rawRows,
      },
      this.spreadsheetId,
      roughRange,
      {
        valueInputOption: "USER_ENTERED",
      },
    );
  }
  batchUpdateByRequests(requests: BatchUpdateRequest[]) {
    // if (rowsDeletedOrSorted) {
    //   // mark sheet rowIndexesAreValid as false
    // }

    Sheets.Spreadsheets.batchUpdate({ requests }, this.spreadsheetId);
  }
}
