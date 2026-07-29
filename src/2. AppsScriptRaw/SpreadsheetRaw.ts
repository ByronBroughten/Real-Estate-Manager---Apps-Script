import { spreadsheetConfig } from "../0. spreadsheetMetaData/1. spreadsheetConfig";
import { SpreadsheetSchema } from "../1. SpreadsheetSchema/SpreadsheetSchema";
import { valS } from "../utils/validation";
import { SpreadsheetRawBase } from "./ClassBases/SpreadsheetRawBase";
import { SheetRaw } from "./SheetRaw";
import type {
  GetByDataFilterRequest,
  GoogleSpreadsheet,
  GridRange,
} from "./Types/AppsScriptTypes";
import type { BatchUpdateRequest, RawSheetsState } from "./Types/RawState";

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
        "sheets(properties(sheetId,title),tables(name,range,tableId),data(rowData(values(formattedValue))))",
    });
  }
  getSheets(gridRanges: GridRange[]) {
    this._getByDataFilter({
      dataFilters: gridRanges.map((gr) => ({
        gridRange: gr,
      })),
    });
  }
  get schema() {
    return new SpreadsheetSchema();
  }
  addSheetsToState() {
    type Test = {
      gid: number;
      numberOfDataRows: number;
      columnIdxs: number[];
    }[];
    // always get header rows

    // Should I just cut the crap and put column indexes in the schema? Yeah, I think so. It's better than headers, honestly, which change just as often.
    // Then I can do everything in one call, and I can verify the data is correct.
  }

  initSheets() {
    const metaResponse = Sheets.Spreadsheets.get(this.spreadsheetId, {
      fields: "sheets(properties(sheetId,title),tables(name,range, tableId))",
    });

    const rawSheets = metaResponse.sheets.reduce((sheets, sheet) => {
      const sheetId = valS.assertDefined(
        sheet?.properties?.sheetId,
        "sheetId not found",
      );
      const title = valS.assertDefined(
        sheet?.properties?.title,
        "title not found",
      );
      const tableName = valS.assertDefined(
        sheet?.tables?.[0]?.name,
        "tableName not found",
      );
      const tableId = valS.assertDefined(
        sheet?.tables?.[0]?.tableId,
        "tableId not found",
      );
      sheets.set(sheetId, { title, tableName, tableId, rowData: new Map() });
      return sheets;
    }, new Map() as RawSheetsState);
    this.rawState.sheets = rawSheets;
  }
  sheet(sheetGid: number): SheetRaw {
    return new SheetRaw({
      rawState: this.rawState,
      gid: sheetGid,
    });
  }
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
    Sheets.Spreadsheets.batchUpdate({ requests }, this.spreadsheetId);
  }
}
