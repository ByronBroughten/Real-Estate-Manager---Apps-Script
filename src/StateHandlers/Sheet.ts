import type { SectionName } from "../appSchema/1. names/sectionNames";
import type {
  SectionValues,
  VarbName,
  VarbValue,
} from "../appSchema/2. attributes/sectionVarbAttributes";
import type { SectionSchema } from "../appSchema/4. generated/sectionsSchema";
import { Row, type RowState } from "./Row";
import { SpreadsheetBase, type SpreadsheetProps } from "./Spreadsheet";

type Headers<SN extends SectionName> = { [VN in VarbName<SN>]: number };
type Rows<SN extends SectionName> = {
  [id in string]: RowState<SN>;
};

// "add" should enforce originalColCount === varbNameCount
type ChangeToSave<SN extends SectionName> =
  | { action: "add" }
  | { action: "delete" }
  | { action: "update"; varbsToUpdate: Set<VarbName<SN>> };
type ChangesToSave<SN extends SectionName> = {
  [rowId: string]: ChangeToSave<SN>;
};

export type SheetState<SN extends SectionName> = {
  sheetName;
  varbNameCount: number;
  originalColCount: number;
  originalRowCount: number;

  addSafe: boolean;
  loadValues: boolean;

  rows: Rows<SN>;
  rowOrder: string[];
  headerIndices: Headers<SN>;

  changesToSave: ChangesToSave<SN>;
};

// getRangeData() {
//   const rangeData: RangeData[] = [];
//   const headerRowIdx = this.headerRowIdx;
//   const lastRowIdx = this.lastBodyRowIdx;
//   for (const varbName of this.varbNames) {
//     const { idx, wasUpdated } = this.colTracker[varbName];
//     if (wasUpdated) {
//       const range = asU.range.getA1({
//         sheetName: this.state.sheetName,
//         startBase0: { rowIdx: headerRowIdx, colIdx: idx },
//         endBase0: { rowIdx: lastRowIdx, colIdx: idx },
//       });
//       rangeData.push({
//         range,
//         values: this.standardizedCol(idx),
//       });
//     }
//   }
//   return rangeData;
// }

export interface SheetProps<SN extends SectionName> extends SpreadsheetProps {
  sectionName: SN;
}

export class SheetBase<SN extends SectionName> extends SpreadsheetBase {
  readonly sectionName: SN;
  constructor({ sectionName, ...props }: SheetProps<SN>) {
    super(props);
    this.sectionName = sectionName;
  }
  get sheetState(): SheetState<SN> {
    return this.spreadsheetState[this.sectionName];
  }
  get sectionSchema(): SectionSchema<SN> {
    return this.sectionsSchema.section(this.sectionName);
  }
}

export class Sheet<SN extends SectionName> extends SheetBase<SN> {
  get state(): SheetState<SN> {
    return this.sheetState;
  }
  get schema(): SectionSchema<SN> {
    return this.sectionSchema;
  }
  get sheetProps(): SheetProps<SN> {
    return {
      sectionName: this.sectionName,
      ...this.spreadsheetProps,
    };
  }
  get rows(): Rows<SN> {
    return this.state.rows;
  }
  get lastRowIdx(): number {
    return this.state.rowOrder.length - 1;
  }
  get varbNames(): VarbName<SN>[] {
    return this.schema.varbNames;
  }
  colIdx<VN extends VarbName<SN>>(varbName: VN): number {
    return this.state.headerIndices[varbName];
  }
  row(id: string): Row<SN> {
    return new Row({
      id,
      ...this.sheetProps,
    });
  }

  get topRow() {
    return this.row(this.state.rowOrder[0]);
  }
  get bottomRow() {
    return this.row(this.state.rowOrder[this.lastRowIdx]);
  }
  topRowValue<VN extends VarbName<SN>>(varbName: VN): VarbValue<SN, VN> {
    return this.topRow.value(varbName);
  }
  private addEmptyRow(): Sheet<SN> {
    //
    const rowState: any[] = new Array(this.topRow.rowState.length).fill("");
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
