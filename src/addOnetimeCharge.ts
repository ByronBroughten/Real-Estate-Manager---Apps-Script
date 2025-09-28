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
const topBodyRowIdx = 2;

type RowData = any[];
type SheetValues = RowData[];
type ColInfo = { idx: number; wasUpdated: boolean };
type ColTracker<SN extends SectionName> = Record<VarbName<SN>, ColInfo>;

type SheetState<SN extends SectionName> = {
  colTracker: ColTracker<SN>;
  values: SheetValues;
};

type SpreadsheetState<SNS extends SectionName> = {
  [SN in SNS]: SheetState<SN>;
};

export function addOnetimeCharge() {
  // Then I just have to add something for batchUpdateRanges that automatically creates
  // all the range data and updates the spreadsheet accordingly.
  // After that, I should be able to crank out the apis and automations.
  // const sheetAddOnetime = Sheet.init("addHhChargeOnetime");
  // const sheetOnetime = Sheet.init("hhChargeOnetime");
  // const sheetUnit = Sheet.init("unit");
  // const sheetHousehold = Sheet.init("household");
  // const rowAddOnetime = sheetAddOnetime.topBodyRow;
  // // get all the values
  // sheetAddOnetime.addRowAndValues({});
  // // get the range data for sheetAddOnetime and sheetOnetime
}

export class Spreadsheet<SNS extends SectionName = SectionName> {
  sectionNames: readonly SNS[];
  state: SpreadsheetState<SNS>;
  sectionsSchema: SectionsSchema;
  constructor(
    sectionNames: readonly SNS[],
    state: SpreadsheetState<SNS>,
    sectionsSchema: SectionsSchema
  ) {
    this.sectionNames = sectionNames;
    this.state = state;
    this.sectionsSchema = sectionsSchema;
  }
  pushAllChanges() {
    // Ok. for every sheet that has been updated,
    // I need to get its range data:
    // asU.batchUpdateRanges(
    //   [chargeOnetime.rangeData, apiAddChargeOnetime.rangeData],
    //   spreadsheets.realEstateManager.id
    // );
  }
  getRangeData() {
    // for each sheet and each column that was updated
    // I need the range (sheet name, column data range), and column values
  }

  static init<SNS extends SectionName>(
    sectionNames: readonly SNS[]
  ): Spreadsheet<SNS> {
    return new Spreadsheet(
      sectionNames,
      this.initState(sectionNames),
      new SectionsSchema()
    );
  }
  private static initState<SNS extends SectionName>(
    sectionNames: readonly SNS[]
  ): SpreadsheetState<SNS> {
    return sectionNames.reduce((state, sectionName) => {
      state[sectionName] = this.initSheetState(sectionName);
      return state;
    }, {} as SpreadsheetState<SNS>);
  }
  private static initSheetState<SN extends SectionName>(
    sectionName: SN
  ): SheetState<SN> {
    const schema = new SectionsSchema();
    const { sheetId } = schema.section(sectionName);
    const values = asU.range.getValuesBySheetId(sheetId);
    const headers = values[headerRowIdx];
    const colTracker = this.initColTracker(sectionName, headers);
    return {
      colTracker,
      values,
    };
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
}

export class Sheet<SN extends SectionName> {
  readonly sectionName: SN;
  private spreadsheet: Spreadsheet<SN>;

  constructor(sectionName: SN, spreadsheet: Spreadsheet<SN>) {
    this.sectionName = sectionName;
    this.spreadsheet = spreadsheet;
  }
  get sectionSchema(): SectionSchema<SN> {
    return this.spreadsheet.sectionsSchema.section(this.sectionName);
  }
  get sheetState(): SheetState<SN> {
    return this.spreadsheet.state[this.sectionName];
  }
  get values(): SheetValues {
    return this.sheetState.values;
  }
  get colTracker(): ColTracker<SN> {
    return this.sheetState.colTracker;
  }
  get headerRowIdx(): number {
    return headerRowIdx;
  }
  get topBodyRowIdx(): number {
    return topBodyRowIdx;
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
  get topBodyRow() {
    return this.row(this.topBodyRowIdx);
  }
  get lastBodyRow() {
    return this.row(this.values.length - 1);
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
  addRowAndValues(values: Partial<SectionValues<SN>>): Sheet<SN> {
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
  get rowState(): any[] {
    return this.sheet.values[this.rowIdx];
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
