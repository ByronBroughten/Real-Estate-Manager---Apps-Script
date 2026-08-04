import { SpreadsheetSchemaRaw } from "../1.1 SpreadsheetSchemaRaw/SpreadsheetSchemaRaw";
import { valS } from "../utils/validation";
import { SpreadsheetRawBase } from "./ClassBases/SpreadsheetRawBase";
import type { RowRaw } from "./RowRaw";
import { SheetRaw } from "./SheetRaw";
import type {
  GoogleSpreadsheet,
  GoogleUpdateRequests,
} from "./Types/AppsScriptTypes";
import type { InitSheetsPropsRaw } from "./Types/RawState";

export class SpreadsheetRaw extends SpreadsheetRawBase {
  get schema() {
    return new SpreadsheetSchemaRaw();
  }
  get activeSheetGids(): MapIterator<number> {
    return this.rawState.sheets.keys();
  }
  sheet(sheetGid: number): SheetRaw {
    return new SheetRaw({
      rawState: this.rawState,
      sheetGid: sheetGid,
    });
  }
  initSheets(...propArr: InitSheetsPropsRaw[]): void {
    this._gatherGridRanges(propArr);
    const data = this._getByDataFilter();
    this._addDataToState(data);
    this.rawState.getterGridRanges = [];
  }
  loadSheetPropertiesGetGids(): number[] {
    const data = Sheets.Spreadsheets.get(this.spreadsheetId, {
      includeGridData: true,
      fields: "sheets(properties(sheetId,title),tables(name,tableId))",
    });
    this._addDataToState(data);
    return data.sheets.map((s) =>
      valS.assertDefined(s.properties.sheetId, "sheetId"),
    );
  }
  private _getByDataFilter(): GoogleSpreadsheet {
    return Sheets.Spreadsheets.getByDataFilter(
      this._makeGetterResource(),
      this.spreadsheetId,
      {
        fields:
          "sheets(properties(sheetId,title),tables(name,tableId),data(startColumn,startRow,columnMetadata(hiddenByUser),rowData(values(effectiveValue))))",
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

  private _gatherGridRanges(props: InitSheetsPropsRaw[]) {
    props.forEach((prop) => {
      const startRowIndex = prop.startRowIndex;
      const rowCount = prop.rowCount;
      for (const sheetId of prop.sheets.keys()) {
        const propColIdx = prop.sheets[sheetId];
        let columnIdxes: number[] = [];
        if (propColIdx === "allColumns") {
          columnIdxes.push(...this.schema.sheet(sheetId).allColumnIdxes);
        } else {
          columnIdxes.push(...propColIdx);
        }
        this.sheet(sheetId).gatherGetRequests({
          startRowIndex,
          rowCount,
          startColumnIndexes: columnIdxes,
        });
      }
    });
  }
  private _addDataToState(gss: GoogleSpreadsheet) {
    gss.sheets.forEach((gSheet) => {
      const sheetGid = valS.assertDefined(gSheet.properties.sheetId, "sheetId");
      const sheet = this.sheet(sheetGid);
      sheet.initSheetState(gSheet);
    });
  }
  rowBySheetRowId(sheetRowId: string): RowRaw {
    const { sheetGid, rowIdx } = this.schema.idsFromSheetRowId(sheetRowId);
    return this.sheet(sheetGid).row(rowIdx);
  }
  batchUpdateGSheets() {
    this._gatherUpdateRequests();
    Sheets.Spreadsheets.batchUpdate(
      { requests: this.rawState.updateRequests },
      this.spreadsheetId,
    );
    this.rawState.sheetsInvalidateIdxesOnUpdate.forEach((sheetGid) => {
      this.sheet(sheetGid).invalidateRowIndexes();
    });
    this.rawState.sheetsInvalidateIdxesOnUpdate.clear();
    this.rawState.updateRequests = [];
  }
  private _gatherUpdateRequests() {
    const changes = this.allChangesToSave;
    const requests = {
      append: [] as GoogleUpdateRequests[],
      update: [] as GoogleUpdateRequests[],
      delete: [] as GoogleUpdateRequests[],
    } as const;

    for (const [sheetRowId, change] of changes.entries()) {
      if (change.append && change.delete) {
        continue;
      } else if (change.delete) {
        requests.delete.push(change.delete);
        const { sheetGid } = this.schema.idsFromSheetRowId(sheetRowId);
        this.rawState.sheetsInvalidateIdxesOnUpdate.add(sheetGid);
      } else {
        const row = this.rowBySheetRowId(sheetRowId);
        if (change.append) {
          requests.append.push(row.appendRequest);
        }
        for (const columnName of change.update) {
          requests.update.push(row.updateRequest(columnName));
        }
      }
    }
    this.updateRequests.push(
      ...requests.append,
      ...requests.update,
      ...requests.delete,
    );
    this.rawState.changesToSave = new Map();
  }

  // appendRange(roughRange: string, rawRows: any[][]) {
  //   // depreciated
  //   Sheets.Spreadsheets?.Values?.append(
  //     {
  //       values: rawRows,
  //     },
  //     this.spreadsheetId,
  //     roughRange,
  //     {
  //       valueInputOption: "USER_ENTERED",
  //     },
  //   );
  // }
}
