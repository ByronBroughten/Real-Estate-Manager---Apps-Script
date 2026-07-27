import { spreadsheetConfig } from "../../1. SpreadsheetSchema/0. sheetMetaData/1. spreadsheetConfig";
import {
  SpreadsheetRawBase,
  type BatchUpdateRequest,
} from "./ClassBases/SpreadsheetRawBase";
import { SheetRaw } from "./SheetRaw";

function getNativeTableNames() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const spreadsheetId = ss.getId();

  // Call the Advanced Sheets API to get spreadsheet metadata
  const metadata = Sheets.Spreadsheets.get(spreadsheetId);

  // Iterate through all tabs in the file
  metadata.sheets.forEach((sheet) => {
    const sheetName = sheet.properties.title;
  });
}

export class SpreadsheetRaw extends SpreadsheetRawBase {
  get headerRowIdxBase1(): number {
    return spreadsheetConfig.headerRowIdxBase1;
  }
  get spreadsheetId(): string {
    return this.gss.getId();
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
