import { spreadsheetConfig } from "../0. spreadsheetMetaData/1. spreadsheetConfig";
import {
  SpreadsheetRawBase,
  type BatchUpdateRequest,
  type RawSheetsState,
} from "./ClassBases/SpreadsheetRawBase";
import { SheetRaw } from "./SheetRaw";

export class SpreadsheetRaw extends SpreadsheetRawBase {
  get headerRowIdxBase1(): number {
    return spreadsheetConfig.headerRowIdxBase1;
  }
  get spreadsheetId(): string {
    return this.gss.getId();
  }

  initSheets() {
    const metaResponse = Sheets.Spreadsheets.get(this.spreadsheetId, {
      fields: "sheets(properties(sheetId,title),tables(name,range, tableId))",
    });

    function error(whatNotFound: string): string {
      throw new Error(`${whatNotFound} not found.`);
    }

    const rawSheets = metaResponse.sheets.reduce((sheets, sheet) => {
      const sheetId = sheet?.properties?.sheetId || error("sheetId");
      const title = sheet?.properties?.title || error("title");
      const tableName = sheet?.tables?.[0]?.name || error("tableName");
      const tableId = sheet?.tables?.[0]?.tableId || error("tableId");
      const endRowIdxBase0 = sheet?.data?.[0]?.rowData.length - 1;
      sheets[sheetId] = { title, tableName, tableId, endRowIdxBase0 };
      return sheets;
    }, {} as RawSheetsState);

    this.rawState.sheets = rawSheets;
  }
  sheet(sheetGid: number): SheetRaw {
    return new SheetRaw({
      rawState: this.rawState,
      gid: sheetGid,
    });
  }
  appendRange(roughRange: string, rawRows: any[][]) {
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
