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
import { asU, type DataFilterRange, type RangeData } from "../utilitiesAppsScript.js";
import { Arr } from "../utils/Arr.js";
import { Obj } from "../utils/Obj.js";
import type { HeaderIndices, Rows, SheetState } from "./Sheet.js";
import {Sheet} from "./Sheet.js";



type SpreadsheetState = {
  [SN in SectionName]: SheetState<SN>;
};

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

type SheetProps = { isAddOnly?: boolean; };

export class Spreadsheet extends SpreadsheetBase {
  static init(): Spreadsheet {
    return new Spreadsheet({
      spreadsheetState: {} as SpreadsheetState,
      sectionsSchema: new SectionsSchema(),
      gss: SpreadsheetApp.getActiveSpreadsheet(),
    });
  }
  private initSheetState<SN extends SectionName>(
    sectionName: SN,
    props: SheetProps
  ): SheetState<SN> {
    const schema = this.sectionsSchema.section(sectionName);
    const sheet = this.gss.getSheetById(schema.sheetId);

    const range = sheet.getDataRange();
    const lastColIdx = range.getLastColumn();
    const lastRowIdx = range.getLastRow();

    const isAddSafe = schema.varbNames.length === lastColIdx;
    const isAddOnly = props.isAddOnly || false;
    if (isAddOnly && !isAddSafe) {
      throw new Error(
        "Sheet is addOnly but not addSafe. Not enough varbNames for columns."
      );
    }

    const headerRowRange = sheet.getRange(this.headerRowIdx, 0, 1, lastColIdx);
    const headerValues = headerRowRange.getValues()[0];
    const headerIndices = this.getVarbNameIndices(sectionName, headerValues);
    const headerOrder = [...schema.varbNames].sort((a, b) => headerIndices[a] - headerIndices[b]);
    

    const bodyRowIdRange = sheet.getRange(this.topBodyRowIdx, 0, lastRowIdx - this.topBodyRowIdx + 1, 1);
    const bodyRowIdValues = bodyRowIdRange.getValues();
    const bodyRowOrder = bodyRowIdValues.map((row) => row[0]);
    
    const bodyRows: Rows<SN> = {}
    if (!isAddOnly) {
      const bodyRowRange = sheet.getRange(this.topBodyRowIdx, 0, lastRowIdx - this.topBodyRowIdx + 1, 1);
      const bodyRowValues = bodyRowRange.getValues();
    }
    
    return {
      sheetName: sheet.getName(),      
      isAddSafe,
      isAddOnly,
      headerIndices,
      headerOrder,
      bodyRows,
      bodyRowOrder,
      changesToSave: {},
      rangeData: [],
    };
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
  sheet<SN extends SectionName>(sectionName: SN, props: SheetProps={ isAddOnly: false }): Sheet<SN> {
    if (!this.sectionNames.includes(sectionName)) {
      this.state[sectionName] = this.initSheetState(
        sectionName,
        props
      ) as SpreadsheetState[SN];
    }
    return new Sheet({
      sectionName: sectionName,
      ...this.spreadsheetProps
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
      }
    );
  }
  batchUpdateRanges() {
    const rangeData = this.getRangeData();
    Sheets.Spreadsheets?.Values?.batchUpdateByDataFilter({
      valueInputOption: "USER_ENTERED",
      data: rangeData,
    }, this.spreadsheetId);
    // Sheets.Spreadsheets?.Values?.batchUpdate(
    //   {
    //     valueInputOption: "USER_ENTERED",
    //     data: rangeDataArr,
    //   },
    //   this.spreadsheetId
    // );
  }
  private getRangeData(): DataFilterRange[] {
    const rangeData: DataFilterRange[] = [];
    for (const sectionName of this.sectionNames) {
      const sheet = this.sheet(sectionName);
      rangeData.push(...sheet.collectRangeData());
    }
    return rangeData;
  }
  private getVarbNameIndices<SN extends SectionName>(
    sectionName: SN,
    headers: string[]
  ): HeaderIndices<SN> {
    const schema = this.sectionsSchema.section(sectionName);
    const indices: HeaderIndices<SN> = {} as HeaderIndices<SN>;
    for (const varbName of schema.varbNames) {
      const { displayName } = schema.varb(varbName);
      const colIdx = headers.indexOf(displayName);
      if (colIdx === -1) {
        throw new Error(
          `Header ${displayName} not found in sheet for section ${sectionName}`
        );
      }
      indices[varbName] = colIdx;
    }
    return indices;
  }

