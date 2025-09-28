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
import { asU } from "./utilitiesAppsScript.js";
import { Obj } from "./utils/Obj.js";

// export function trigger(e) {
//   const addOnetimeChargeRange = asU.range.getNamed("apiAddOnetimeChargeEnter");
//   if (e.range.getA1Notation() === addOnetimeChargeRange.getA1Notation()) {
//     handleAddOnetimeCharge();
//     addOnetimeChargeRange.setValue(false);
//   }
// }

const headerRowIdx = 1;
const topValueRowIdx = 2;

type RowData = any[];
type SheetData = RowData[];
type ColInfo = { idx: number; wasUpdated: boolean };
type ColTracker<SN extends SectionName> = Record<VarbName<SN>, ColInfo>;

type SheetState<SN extends SectionName> = {
  colTracker: ColTracker<SN>;
  sheetData: SheetData;
};

type SpreadsheetState<SNS extends SectionName> = {
  [SN in SNS]: SheetState<SN>;
};

export function addOnetimeCharge() {
  // Here I must integrate the spreadsheet class with the Sheet and Row classes.
  // Then I just have to add something for batchUpdateRanges that automatically creates
  // all the range data and updates the spreadsheet accordingly.
  // After that, I should be able to crank out the apis and automations.
  // const sheetAddOnetime = Sheet.init("addHhChargeOnetime");
  // const sheetOnetime = Sheet.init("hhChargeOnetime");
  // const sheetUnit = Sheet.init("unit");
  // const sheetHousehold = Sheet.init("household");
  // const rowAddOnetime = sheetAddOnetime.topValueRow;
  // // get all the values
  // sheetAddOnetime.addRowAndValues({});
  // // get the range data for sheetAddOnetime and sheetOnetime
  // asU.batchUpdateRanges(
  //   [chargeOnetime.rangeData, apiAddChargeOnetime.rangeData],
  //   spreadsheets.realEstateManager.id
  // );
}

export class Spreadsheet<SNS extends SectionName> {
  sectionNames: readonly SNS[];
  state: SpreadsheetState<SNS>;
  constructor(sectionNames: readonly SNS[]) {
    this.sectionNames = sectionNames;
  }
  static initState<SNS extends SectionName>(
    sectionNames: SNS[]
  ): SpreadsheetState<SNS> {
    return sectionNames.reduce((state, sectionName) => {
      state[sectionName] = this.initSheetState(sectionName);
      return state;
    }, {} as SpreadsheetState<SNS>);
  }
  private static initColTracker<SN extends SectionName>(
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
  private static initSheetState<SN extends SectionName>(
    sectionName: SN
  ): SheetState<SN> {
    const schema = new SectionsSchema();
    const { sheetId } = schema.section(sectionName);
    const sheetData = asU.range.getValuesBySheetId(sheetId);
    const headers = sheetData[headerRowIdx];
    const colTracker = this.initColTracker(sectionName, headers);
    return {
      colTracker,
      sheetData,
    };
  }
}

export class Sheet<SN extends SectionName> {
  private sectionName: SN;
  readonly state: SheetData;
  readonly sectionsSchema: SectionsSchema;
  readonly colTracker: ColTracker<SN>;

  constructor(
    sectionName: SN,
    state: SheetData,
    colTracker: ColTracker<SN>,
    sectionsSchema: SectionsSchema
  ) {
    this.sectionName = sectionName;
    this.state = state;
    this.sectionsSchema = sectionsSchema;
    this.colTracker = colTracker;
  }
  get sectionSchema(): SectionSchema<SN> {
    return this.sectionsSchema.section(this.sectionName);
  }
  get headerRowIdx(): number {
    return headerRowIdx;
  }
  get topValueRowIdx(): number {
    return topValueRowIdx;
  }
  colIdx<VN extends VarbName<SN>>(varbName: VN): number {
    return this.colTracker[varbName].idx;
  }
  colUpdated<VN extends VarbName<SN>>(varbName: VN): Sheet<SN> {
    this.colTracker[varbName].wasUpdated = true;
    return this;
  }
  row(rowIdx: number): Row<SN> {
    return new Row(this, rowIdx);
  }
  get topValueRow() {
    return this.row(this.topValueRowIdx);
  }
  get lastValueRow() {
    return this.row(this.state.length - 1);
  }
  get valueRows(): Row<SN>[] {
    const rows: Row<SN>[] = [];
    for (let i = this.topValueRowIdx; i < this.state.length; i++) {
      rows.push(this.row(i));
    }
    return rows;
  }
  topValue<VN extends VarbName<SN>>(varbName: VN): VarbValue<SN, VN> {
    return this.topValueRow.value(varbName);
  }
  private addEmptyRow(): Sheet<SN> {
    const rowState: any[] = new Array(this.topValueRow.rowState.length).fill(
      ""
    );
    this.state.push(rowState);
    return this;
  }
  addRowDefault(): Sheet<SN> {
    this.addEmptyRow();
    const row = this.lastValueRow;
    this.sectionSchema.varbNames.forEach((varbName) => {
      const varbSchema = this.sectionSchema.varb(varbName);
      row.setValue(varbName, varbSchema.makeDefaultValue());
    });
    return this;
  }
  addRowAndValues(values: Partial<SectionValues<SN>>): Sheet<SN> {
    this.addRowDefault();
    const row = this.lastValueRow;
    row.setValues(values);
    return this;
  }
}

class Row<SN extends SectionName> {
  private sheet: Sheet<SN>;
  private rowIdx: number;

  constructor(sheet: Sheet<SN>, rowIdx: number) {
    this.sheet = sheet;
    this.rowIdx = rowIdx;
  }
  get rowState(): any[] {
    return this.sheet.state[this.rowIdx];
  }
  value<VN extends VarbName<SN>>(varbName: VN): VarbValue<SN, VN> {
    const colIdx = this.sheet.colIdx(varbName);
    return this.rowState[colIdx] as VarbValue<SN, VN>;
  }
  setValue<VN extends VarbName<SN>, VL extends VarbValue<SN, VN>>(
    varbName: VN,
    value: VL
  ): Row<SN> {
    const colIdx = this.sheet.colIdx(varbName);
    this.rowState[colIdx] = value as any;
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
