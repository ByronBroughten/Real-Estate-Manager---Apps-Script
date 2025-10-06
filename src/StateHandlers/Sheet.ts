import type { SectionName } from "../appSchema/1. names/sectionNames";
import type {
  SectionValues,
  VarbName,
  VarbValue,
} from "../appSchema/2. attributes/sectionVarbAttributes";
import type { SectionSchema } from "../appSchema/4. generated/sectionsSchema";
import { type DataFilterRange } from "../utilitiesAppsScript";
import { Obj } from "../utils/Obj";
import {
  SheetBase,
  type ChangesToSave,
  type RowChangesToSave,
  type Rows,
  type SheetState,
} from "./HandlerBases/SheetBase";
import { Row } from "./Row";

type RowChangeProps<SN extends SectionName> =
  | { action: "add" | "delete" }
  | { action: "update"; varbNames: VarbName<SN>[] };

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
