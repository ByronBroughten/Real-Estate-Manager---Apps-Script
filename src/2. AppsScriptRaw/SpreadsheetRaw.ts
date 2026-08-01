import { SpreadsheetSchemaRaw } from "../1.1 SpreadsheetSchemaRaw/SpreadsheetSchemaRaw";
import { valS } from "../utils/validation";
import { SpreadsheetRawBase } from "./ClassBases/SpreadsheetRawBase";
import { SheetRaw, type RowCount } from "./SheetRaw";
import type {
  GoogleSpreadsheet,
  GoogleUpdateRequests,
} from "./Types/AppsScriptTypes";

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
    this._gatherGridRanges(props);
    const data = this.getByDataFilter();
    this._addDataToState(data);
    this.rawState.getterGridRanges = [];
  }
  getByDataFilter(): GoogleSpreadsheet {
    return Sheets.Spreadsheets.getByDataFilter(
      this._makeGetterResource(),
      this.spreadsheetId,
      {
        fields:
          "sheets(properties(sheetId,title),tables(name,tableId),data(startColumn,startRow,rowData(values(formattedValue))))",
      },
    );
  }
  private _makeGetterResource() {
    return {
      dataFilters: this.rawState.getterGridRanges.map((gr) => ({
        gridRange: gr,
      })),
      includeGridData: true,
    };
  }

  private _gatherGridRanges(props: RowsSheetsReqPropsRaw) {
    props.keys().forEach((rowCount) => {
      const propSheet = props[rowCount] as SheetsReqProps;
      propSheet.keys().forEach((sheetId) => {
        const colIdxes = propSheet.get(sheetId);
        this.sheet(sheetId).gatherGetRequests({
          startRowIndex: this.schema.config("topFetchRowIdx"),
          rowCount,
          startColumnIndexes: colIdxes || [],
        });
      });
    });
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
  batchUpdateByRequests(requests: GoogleUpdateRequests[]) {
    // if (rowsDeletedOrSorted) {
    //   // mark sheet rowIndexesAreValid as false
    // }
    Sheets.Spreadsheets.batchUpdate({ requests }, this.spreadsheetId);
  }
}
