import type { SectionName } from "../appSchema/1. names/sectionNames.js";
import type {
  SectionValues,
  VarbName,
  VarbValue,
} from "../appSchema/2. attributes/sectionVarbAttributes.js";
import {
  SectionSchema,
  SectionsSchema,
} from "../appSchema/4. generated/sectionsSchema.js";
import { asU, type RangeData } from "../utilitiesAppsScript.js";
import { Obj } from "../utils/Obj.js";
import type { SheetState } from "./Sheet.js";
import {Sheet} from "./Sheet.js";

type SpreadsheetState = {
  [SN in SectionName]: SheetState<SN>;
};

export type CellValue = number | Date | string | boolean;


export interface SpreadsheetProps {
  spreadsheetState: SpreadsheetState;
  sectionsSchema: SectionsSchema;
  gss: GoogleAppsScript.Spreadsheet.Spreadsheet;
}

export class SpreadsheetBase {
  readonly spreadsheetState: SpreadsheetState;
  readonly sectionsSchema: SectionsSchema;
  readonly gss: GoogleAppsScript.Spreadsheet.Spreadsheet;
  constructor(props: SpreadsheetProps) {
    this.spreadsheetState = props.spreadsheetState;
    this.sectionsSchema = props.sectionsSchema;
    this.gss = props.gss;
  }
  get spreadsheetProps(): SpreadsheetProps {
    return {
      spreadsheetState: this.spreadsheetState,
      sectionsSchema: this.sectionsSchema,
      gss: this.gss,
    };
  }
  get headerRowIdx(): number {
    return this.sectionsSchema.headerRowIdx;
  }
  get topBodyRowIdx(): number {
    return this.sectionsSchema.topBodyRowIdx;
  }
}

export class Spreadsheet extends SpreadsheetBase {
  get state(): SpreadsheetState {
    return this.spreadsheetState;
  }
  pushAllChanges(): void {
    const rangeData = this.getRangeData();
    this.batchUpdateRanges(rangeData);
  }
  appendRange(roughRange: string, rawRows: any[][]) {
    Sheets.Spreadsheets?.Values?.append(
      {
        values: rawRows,
      },
      this.gss.getId(),
      roughRange,
      {
        valueInputOption: "USER_ENTERED",
      }
    );
  }
  private standardizedValue(value: CellValue): Exclude<CellValue, Date> {
    if (value instanceof Date) {
      value = asU.standardize.date(value);
    }
    return value;
  }
  private batchUpdateRanges(rangeDataArr: RangeData[]) {
    Sheets.Spreadsheets?.Values?.batchUpdate(
      {
        valueInputOption: "USER_ENTERED",
        data: rangeDataArr,
      },
      this.gss.getId()
    );
  }
  getRangeData(): RangeData[] {
    const rangeData: RangeData[] = [];
    for (const sectionName of this.sectionNames) {
      const sheet = this.sheet(sectionName);
      rangeData.push(...sheet.getRangeData());
    }
    return rangeData;
  }
  get sectionNames(): SectionName[] {
    return Obj.keys(this.state);
  }

  sheet<SN extends SectionName>(sectionName: SN): Sheet<SN> {
    if (!this.sectionNames.includes(sectionName)) {
      this.state[sectionName] = this.initSheetState(
        sectionName
      ) as SpreadsheetState[SN];
    }
    return new Sheet({
      sectionName: sectionName,
      ...this.spreadsheetProps
    });
  }

  static init(): Spreadsheet {
    return new Spreadsheet({
      spreadsheetState: {} as SpreadsheetState,
      sectionsSchema: new SectionsSchema(),
      gss: SpreadsheetApp.getActiveSpreadsheet(),
    });
  }
  private initSheetState<SN extends SectionName>(
    sectionName: SN
  ): SheetState<SN> {
    const { sheetId } = this.sectionsSchema.section(sectionName);
    const sheet = this.gss.getSheetById(sheetId);
    const dataRange = sheet.getDataRange();

    const sheetName = sheet.getName();
    const a1Range = dataRange.getA1Notation();
    const values = dataRange.getValues();
    const headers = values[this.headerRowIdx];

    return {
      sheetName,

      colTracker: this.initColTracker(sectionName, headers),
      values,
      a1Range,
    };
  }
  private initColTracker<SN extends SectionName>(
    sectionName: SN,
    headers: string[]
  ): ColTracker<SN> {
    const schema = new SectionsSchema();
    const { varbNames } = schema.section(sectionName);
    const colTracker: ColTracker<SN> = {} as ColTracker<SN>;
    for (const varbName of varbNames) {
      const { displayName } = schema.varb(sectionName, varbName);
      const colIdx = headers.indexOf(displayName);
      if (colIdx === -1) {
        throw new Error(
          `Header ${displayName} not found in sheet for section ${sectionName}`
        );
      }
      colTracker[varbName] = {
        idx: colIdx,
        wasUpdated: false,
      };
    }
    return colTracker;
  }

