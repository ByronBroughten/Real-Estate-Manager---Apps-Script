import type { SectionName } from "./appSchema/1. names/sectionNames.js";
import type {
  SectionValues,
  VarbName,
  VarbValue,
} from "./appSchema/2. attributes/sectionVarbAttributes.js";
import {
  SectionSchema,
  SectionsSchema,
} from "./appSchema/4. generated/sectionsSchema.js";
import { asU, type RangeData } from "./utilitiesAppsScript.js";
import { Obj } from "./utils/Obj.js";

const headerRowIdx = 1;
const topBodyRowIdx = 2;

type CellValue = number | Date | string | boolean;
type RowData = CellValue[];
type SheetValues = RowData[];
type ColInfo = { idx: number; wasUpdated: boolean };
type ColTracker<SN extends SectionName> = Record<VarbName<SN>, ColInfo>;

type SheetState<SN extends SectionName> = {
  sheetName;
  a1Range: string;
  allColsUpdated: boolean;
  colTracker: ColTracker<SN>;
  values: SheetValues;
};

type SpreadsheetState = {
  [SN in SectionName]: SheetState<SN>;
};

export class Spreadsheet {
  state: SpreadsheetState;
  sectionsSchema: SectionsSchema;
  gss: GoogleAppsScript.Spreadsheet.Spreadsheet;
  constructor(
    state: SpreadsheetState,
    sectionsSchema: SectionsSchema,
    gss: GoogleAppsScript.Spreadsheet.Spreadsheet
  ) {
    this.state = state;
    this.sectionsSchema = sectionsSchema;
    this.gss = gss;
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
    return new Sheet(sectionName, this) as unknown as Sheet<SN>;
  }

  static init(): Spreadsheet {
    const schema = new SectionsSchema();
    return new Spreadsheet(
      {} as SpreadsheetState,
      schema,
      SpreadsheetApp.getActiveSpreadsheet()
    );
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
    const headers = values[headerRowIdx];

    return {
      sheetName,
      colTracker: this.initColTracker(sectionName, headers),
      allColsUpdated: false,
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
}

export class Sheet<SN extends SectionName> {
  readonly sectionName: SN;
  private spreadsheet: Spreadsheet;

  constructor(sectionName: SN, spreadsheet: Spreadsheet) {
    this.sectionName = sectionName;
    this.spreadsheet = spreadsheet;
  }
  get sectionSchema(): SectionSchema<SN> {
    return this.spreadsheet.sectionsSchema.section(this.sectionName);
  }
  get state(): SheetState<SN> {
    return this.spreadsheet.state[this.sectionName];
  }
  get values(): SheetValues {
    return this.state.values;
  }
  get colTracker(): ColTracker<SN> {
    return this.state.colTracker;
  }
  get headerRowIdx(): number {
    return headerRowIdx;
  }
  get topBodyRowIdx(): number {
    return topBodyRowIdx;
  }
  get lastBodyRowIdx(): number {
    return this.values.length - 1;
  }
  get varbNames(): VarbName<SN>[] {
    return this.sectionSchema.varbNames;
  }

  getRangeData() {
    const rangeData: RangeData[] = [];
    const headerRowIdx = this.headerRowIdx;
    const lastRowIdx = this.lastBodyRowIdx;
    if (this.state.allColsUpdated) {
      // I'm leaning towards:
      // For each sheet, either its columns will be updated or its rows will be, but not both.
      // Or if both, then rows first.
    } else {
      for (const varbName of this.varbNames) {
        const { idx, wasUpdated } = this.colTracker[varbName];
        if (wasUpdated) {
          const range = asU.range.getA1({
            sheetName: this.state.sheetName,
            startBase0: { rowIdx: headerRowIdx, colIdx: idx },
            endBase0: { rowIdx: lastRowIdx, colIdx: idx },
          });
          rangeData.push({
            range,
            values: this.standardizedCol(idx),
          });
        }
      }
    }
    return rangeData;
  }
  colIdx<VN extends VarbName<SN>>(varbName: VN): number {
    return this.colTracker[varbName].idx;
  }
  colUpdated<VN extends VarbName<SN>>(varbName: VN): Sheet<SN> {
    this.colTracker[varbName].wasUpdated = true;
    return this;
  }
  get allColsUpdated(): boolean {
    return this.state.allColsUpdated;
  }
  setAllColsUpdated() {
    this.state.allColsUpdated = true;
  }
  standardizedCol(colIdx: number): CellValue[][] {
    const col: CellValue[][] = [];
    for (let rawRow of this.state.values) {
      let value = rawRow[colIdx];
      if (value instanceof Date) {
        value = asU.standardize.date(value);
      }
      col.push([value]);
    }
    return col;
  }
  row(rowIdx: number): Row<SN> {
    return new Row(this, rowIdx);
  }
  get topBodyRow() {
    return this.row(this.topBodyRowIdx);
  }
  get lastBodyRow() {
    return this.row(this.lastBodyRowIdx);
  }
  get valueRows(): Row<SN>[] {
    const rows: Row<SN>[] = [];
    for (let i = this.topBodyRowIdx; i < this.values.length; i++) {
      rows.push(this.row(i));
    }
    return rows;
  }
  topBodyValue<VN extends VarbName<SN>>(varbName: VN): VarbValue<SN, VN> {
    return this.topBodyRow.value(varbName);
  }
  private addEmptyRow(): Sheet<SN> {
    const rowState: any[] = new Array(this.topBodyRow.rowState.length).fill("");
    this.values.push(rowState);
    return this;
  }
  addRowDefault(): Sheet<SN> {
    this.addEmptyRow();
    const row = this.lastBodyRow;
    this.sectionSchema.varbNames.forEach((varbName) => {
      const varbSchema = this.sectionSchema.varb(varbName);
      row.setValue(varbName, varbSchema.makeDefaultValue());
    });
    return this;
  }
  addRowWithValues(values: Partial<SectionValues<SN>>): Sheet<SN> {
    this.addRowDefault();
    const row = this.lastBodyRow;
    row.setValues(values);
    return this;
  }
}

class Row<SN extends SectionName> {
  private sheet: Sheet<SN>;
  readonly rowIdx: number;

  constructor(sheet: Sheet<SN>, rowIdx: number) {
    this.sheet = sheet;
    this.rowIdx = rowIdx;
  }
  get schema(): SectionSchema<SN> {
    return this.sheet.sectionSchema;
  }
  get rowState(): any[] {
    return this.sheet.values[this.rowIdx];
  }
  value<VN extends VarbName<SN>>(varbName: VN): VarbValue<SN, VN> {
    const colIdx = this.sheet.colIdx(varbName);
    return this.rowState[colIdx] as VarbValue<SN, VN>;
  }
  get values(): Omit<SectionValues<SN>, "id"> {
    return this.varbNames.reduce((values, varbName) => {
      if (varbName !== "id") {
        values[varbName] = this.value(
          varbName
        ) as (typeof values)[typeof varbName];
      }
      return values;
    }, {} as SectionValues<SN>);
  }
  validateValues(): Omit<SectionValues<SN>, "id"> {
    const values = this.values;
    for (const [varbName, value] of Obj.entries(values)) {
      this.schema.varb(varbName).validate(value);
    }
    return values;
  }

  get varbNames(): VarbName<SN>[] {
    return this.sheet.sectionSchema.varbNames;
  }
  private setValueByIdx(colIdx: number, value: CellValue) {
    this.rowState[colIdx] = value as any;
  }
  clearValues(): Row<SN> {
    this.rowState.forEach((_, idx) => {
      this.setValueByIdx(idx, "");
    });
    this.sheet.setAllColsUpdated();
    return this;
  }
  setValue<VN extends VarbName<SN>, VL extends VarbValue<SN, VN>>(
    varbName: VN,
    value: VL
  ): Row<SN> {
    const colIdx = this.sheet.colIdx(varbName);
    this.setValueByIdx(colIdx, value);
    this.sheet.colUpdated(varbName);
    return this;
  }
  setValues(sectionValues: Partial<SectionValues<SN>>): Row<SN> {
    for (const [varbName, value] of Obj.entries(sectionValues)) {
      this.setValue(varbName, value as VarbValue<SN, typeof varbName>);
    }
    return this;
  }
}
