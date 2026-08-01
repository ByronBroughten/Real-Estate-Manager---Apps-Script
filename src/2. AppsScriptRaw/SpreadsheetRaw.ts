import { SpreadsheetSchemaRaw } from "../1.1 SpreadsheetSchemaRaw/SpreadsheetSchemaRaw";
import { valS } from "../utils/validation";
import { SpreadsheetRawBase } from "./ClassBases/SpreadsheetRawBase";
import { SheetRaw } from "./SheetRaw";
import type {
  BatchUpdateRequest,
  GetByDataFilterRequest,
  GoogleSpreadsheet,
  GridRange,
} from "./Types/AppsScriptTypes";

type RowCount = number | "all";
type SheetId = number;
type ColumnIdx = number;
type SheetsReqProps = Map<SheetId, ColumnIdx[]>;
export type RowsSheetsReqPropsRaw = Map<RowCount, SheetsReqProps>;

export class SpreadsheetRaw extends SpreadsheetRawBase {
  get schema() {
    return new SpreadsheetSchemaRaw();
  }
  get spreadsheetId(): string {
    return this.gss.getId();
  }
  sheet(sheetGid: number): SheetRaw {
    return new SheetRaw({
      rawState: this.rawState,
      sheetGid: sheetGid,
    });
  }
  initSheets(props: RowsSheetsReqPropsRaw) {
    this.schema.validateConfig();
    const gridRanges = this._makeGridRanges(props);
    const data = this._getByDataFilter({
      dataFilters: gridRanges.map((gr) => ({
        gridRange: gr,
      })),
    });
    this._addDataToState(data);
  }
  private _getByDataFilter(request: GetByDataFilterRequest): GoogleSpreadsheet {
    return Sheets.Spreadsheets.getByDataFilter(request, this.spreadsheetId, {
      fields:
        "sheets(properties(sheetId,title),tables(name,tableId),data(startColumn,rowData(values(formattedValue))))",
    });
  }
  private _makeGridRanges(props: RowsSheetsReqPropsRaw): GridRange[] {
    return props.keys().reduce((gridRange, rowCount) => {
      const sheets = props[rowCount] as SheetsReqProps;
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
      startRowIndex: this.schema.colIdRowIdx,
      ...(rowCount === "all"
        ? {}
        : {
            endRowIndex: this.schema.topBodyRowIdx + rowCount,
          }),
    };
  }
  private _addDataToState(gss: GoogleSpreadsheet) {
    gss.sheets.forEach((gSheet) => {
      const sheetGid = valS.assertDefined(gSheet.properties.sheetId, "sheetId");
      const sheet = this.sheet(sheetGid);
      sheet.initSheetState(gSheet);
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
