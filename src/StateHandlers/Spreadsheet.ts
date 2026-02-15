import type { SectionName } from "../appSchema/1. attributes/sectionAttributes.js";
import type {
  SectionValues,
  VarbName,
  VarbValue,
} from "../appSchema/1. attributes/varbAttributes.js";
import { SectionsSchema } from "../appSchema/3. generated/sectionsSchema.js";
import {
  type BatchUpdateRequest,
  type DataFilterRange,
} from "../utilitiesAppsScript.js";
import { Arr } from "../utils/Arr.js";
import { Obj } from "../utils/Obj.js";
import type {
  HeaderIndices,
  Rows,
  SheetState,
} from "./HandlerBases/SheetBase.js";
import {
  SpreadsheetBase,
  type SpreadsheetState,
} from "./HandlerBases/SpreadsheetBase.js";
import { Sheet, type SheetOptions } from "./Sheet.js";


export class Spreadsheet extends SpreadsheetBase {
  static init(): Spreadsheet {
    return new Spreadsheet({
      spreadsheetState: {} as SpreadsheetState,
      sectionsSchema: new SectionsSchema(),
      gss: SpreadsheetApp.getActiveSpreadsheet(),
    });
  }
  gSheetBySectionName(
    sectionName: SectionName
  ): GoogleAppsScript.Spreadsheet.Sheet {
    const schema = this.sectionsSchema.section(sectionName);
    return this.gss.getSheetById(schema.sheetId);
  }
  
  get state(): SpreadsheetState {
    return this.spreadsheetState;
  }
  get spreadsheetId(): string {
    return this.gss.getId();
  }
  get sectionNames(): SectionName[] {
    return Obj.keys(this.state);
  }
  sheet<SN extends SectionName>(
    sectionName: SN,
    options?: SheetOptions
  ): Sheet<SN> {
    if (!this.sectionNames.includes(sectionName)) {
      return Sheet.init(
        sectionName,
        this.spreadsheetProps,
        options
      )
    } else {
      return new Sheet({
        sectionName,
        ...this.spreadsheetProps,
      });
    }
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
      }
    );
  }
  batchUpdateRanges() {
    this.batchUpdateByRequests();
  }
  batchUpdateByRequests() {
    const requests = this.getRequests();
    Sheets.Spreadsheets.batchUpdate({ requests }, this.spreadsheetId);
  }
  private getRequests(): BatchUpdateRequest[] {
    const requests: BatchUpdateRequest[] = [];
    for (const sectionName of this.sectionNames) {
      const sheet = this.sheet(sectionName);
      requests.push(...sheet.collectRequests());
    }
    return requests;
  }
  batchUpdateByDataFilter() {
    // NOTE: delete doesn't work with the data filter method
    const dataFilterRange = this.getDataFilterRange();
    Sheets.Spreadsheets?.Values?.batchUpdateByDataFilter(
      {
        valueInputOption: "USER_ENTERED",
        data: dataFilterRange,
      },
      this.spreadsheetId
    );
  }
  private getDataFilterRange(): DataFilterRange[] {
    const dataFilterRange: DataFilterRange[] = [];
    for (const sectionName of this.sectionNames) {
      const sheet = this.sheet(sectionName);
      dataFilterRange.push(...sheet.collectDataFilters());
    }
    return dataFilterRange;
  }
}
