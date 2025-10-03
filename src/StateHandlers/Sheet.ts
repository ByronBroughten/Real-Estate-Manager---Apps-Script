import type { SectionName } from "../appSchema/1. names/sectionNames";
import type {
  SectionValues,
  VarbName,
  VarbValue,
} from "../appSchema/2. attributes/sectionVarbAttributes";
import type { SectionSchema } from "../appSchema/4. generated/sectionsSchema";
import { type DataFilterRange } from "../utilitiesAppsScript";
import { Obj } from "../utils/Obj";
import { Row, type RowState } from "./Row";
import { SpreadsheetBase, type SpreadsheetProps } from "./Spreadsheet";

export type HeaderIndices<SN extends SectionName> = {
  [VN in VarbName<SN>]: number;
};
export type Rows<SN extends SectionName> = {
  [id in string]: RowState<SN>;
};

type RowChangesToSave<SN extends SectionName> = {
  add: boolean;
  delete: boolean;
  update: Set<VarbName<SN>>;
};

type RowChangeProps<SN extends SectionName> =
  | { action: "add" | "delete" }
  | { action: "update"; varbNames: VarbName<SN>[] };

export type ChangesToSave<SN extends SectionName> = {
  [rowId: string]: RowChangesToSave<SN>;
};

export type SheetState<SN extends SectionName> = {
  sheetName;

  isAddSafe: boolean;
  isAddOnly: boolean;

  // Does rows include headers? No. I want their data to be consistent.
  bodyRows: Rows<SN>;
  bodyRowOrder: string[];
  headerIndices: HeaderIndices<SN>;
  headerOrder: VarbName<SN>[];

  changesToSave: ChangesToSave<SN>;
  rangeData: DataFilterRange[];
};

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
  get sheetProps(): SheetProps<SN> {
    return {
      sectionName: this.sectionName,
      ...this.spreadsheetProps,
    };
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
  get orderedRows(): Row<SN>[] {
    return this.state.bodyRowOrder.map((id) => this.row(id));
  }
  get rows(): Rows<SN> {
    return this.state.bodyRows;
  }
  get lastRowIdx(): number {
    return this.state.bodyRowOrder.length - 1;
  }
  get varbNames(): VarbName<SN>[] {
    return this.schema.varbNames;
  }
  get changesToSave(): ChangesToSave<SN> {
    return this.state.changesToSave;
  }
  addChangeToSave(id: string, rowChange: RowChangeProps<SN>) {
    if (!this.changesToSave[id]) {
      this.changesToSave[id] = this.createRowChanges();
    }
    const changes = this.changesToSave[id];

    if (rowChange.action === "update") {
      for (const varbName of rowChange.varbNames) {
        changes.update.add(varbName);
      }
    } else if (rowChange.action === "add") {
      changes.add = true;
    } else if (rowChange.action === "delete") {
      changes.delete = false;
    } else {
      throw new Error(`Unknown rowChange action: ${rowChange.action}`);
    }
  }
  private createRowChanges<SN extends SectionName>(): RowChangesToSave<SN> {
    return {
      add: false,
      delete: false,
      update: new Set(),
    };
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

  get topBodyRow() {
    return this.row(this.state.bodyRowOrder[0]);
  }
  topBodyRowValue<VN extends VarbName<SN>>(varbName: VN): VarbValue<SN, VN> {
    return this.topBodyRow.value(varbName);
  }
  addRowDefault(): string {
    if (!this.state.isAddSafe) {
      throw new Error(
        "Sheet is not add safe. Not enough varbNames for columns."
      );
    }

    const rowId = this.schema.makeSectionId();
    this.rows[rowId] = this.schema.makeDefaultValues();
    this.state.bodyRowOrder.push(rowId);
    this.addChangeToSave(rowId, { action: "add" });
    return rowId;
  }
  addRowWithValues(values: Partial<SectionValues<SN>>): string {
    const rowId = this.addRowDefault();
    const row = this.row(rowId);
    row.setValues(values);
    return rowId;
  }
  collectRangeData(): DataFilterRange[] {
    const changes = this.changesToSave;
    for (const [rowId, change] of Obj.entries(changes)) {
      if (change.delete) {
        throw new Error(
          "Not implemented. Deleting rows are not yet supported."
        );
      } else if (change.add) {
        this.state.rangeData.push(this.collectAddData(rowId));
      } else {
        for (const varbName of change.update) {
          this.state.rangeData.push(this.collectUpdateData(rowId, varbName));
        }
      }
    }
    const rangeData = [...this.state.rangeData];
    this.state.rangeData = [];
    return rangeData;
  }
  private collectUpdateData<VN extends VarbName<SN>>(rowId, varbName: VN) {
    const row = this.row(rowId);
    const { absoluteIdx } = row;
    return {
      dataFilter: {
        gridRange: {
          sheetId: this.schema.sheetId,
          startRowIndex: absoluteIdx,
          endRowIndex: absoluteIdx,
          startColumnIndex: this.colIdx(varbName),
          endColumnIndex: this.colIdx(varbName),
        },
      },
      values: [[row.value(varbName)]],
    };
  }
  private collectAddData(rowId): DataFilterRange {
    const row = this.row(rowId);
    const { absoluteIdx } = row;
    const { headerOrder } = this.state;
    return {
      dataFilter: {
        gridRange: {
          sheetId: this.schema.sheetId,
          startRowIndex: absoluteIdx,
          endRowIndex: absoluteIdx,
          startColumnIndex: this.colIdx(headerOrder[0]),
          endColumnIndex: this.colIdx(headerOrder[headerOrder.length - 1]),
        },
      },
      values: [headerOrder.map((varbName) => row.value(varbName))],
    };
  }
}
