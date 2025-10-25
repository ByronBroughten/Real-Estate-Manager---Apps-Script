import type { SectionName } from "../appSchema/1. attributes/sectionAttributes";
import type {
  SectionValues,
  VarbName,
  VarbValue,
} from "../appSchema/1. attributes/varbAttributes";
import type { SectionSchema } from "../appSchema/3. generated/sectionsSchema";
import {
  type BatchUpdateRequest,
  type DataFilterRange,
} from "../utilitiesAppsScript";
import { utils } from "../utilitiesGeneral";
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
  sort(varbName: VarbName<SN>): void {
    this.sortWithoutAddingChanges(varbName);
    this.addAllVarbsAsChanges();
  }
  sortWithoutAddingChanges(varbName: VarbName<SN>): void {
    this.state.bodyRowOrder.sort((a, b) => {
      return utils.general.compareForSort(
        this.row(a).value(varbName),
        this.row(b).value(varbName)
      );
    });
  }
  addAllVarbsAsChanges(): void {
    this.orderedRows.forEach((row) => row.addAllVarbsAsChanges());
  }
  DELETE_ALL_BODY_ROWS() {
    if (this.state.bodyRowOrder.length > 0) {
      this.gSheet().deleteRows(
        this.topBodyRowIdxBase1,
        this.state.bodyRowOrder.length
      );
      this.state.bodyRowOrder = [];
      this.state.bodyRows = {};
    }
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

  colIdxBase1<VN extends VarbName<SN>>(varbName: VN): number {
    return this.state.headerIndicesBase1[varbName];
  }
  row(id: string): Row<SN> {
    return new Row({
      id,
      ...this.sheetProps,
    });
  }
  rowsFiltered(values: Partial<SectionValues<SN>>): Row<SN>[] {
    return this.orderedRows.filter((row) => {
      for (const varbName in values) {
        if (row.value(varbName) !== values[varbName]) {
          return false;
        }
      }
      return true;
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
        `Sheet "${this.sectionName}" is not add safe. Not enough varbNames for columns.`
      );
    }

    const rowId = this.schema.makeSectionId();
    this.rows[rowId] = {} as SectionValues<SN>;
    this.state.bodyRowOrder.push(rowId);
    this.addChangeToSave(rowId, { action: "add" });

    const row = this.row(rowId);
    row.setValue("id", rowId);
    row.resetToDefault();
    return rowId;
  }
  addRowWithValues(values: Partial<SectionValues<SN>>): string {
    const rowId = this.addRowDefault();
    const row = this.row(rowId);
    row.setValues(values);
    return rowId;
  }
  gSheet(): GoogleAppsScript.Spreadsheet.Sheet {
    return this.gss.getSheetById(this.schema.sheetId);
  }
  collectRangeData(): DataFilterRange[] {
    const changes = this.changesToSave;
    for (const [rowId, change] of Obj.entries(changes)) {
      if (change.delete) {
        throw new Error(
          "Not implemented. Deleting rows are not yet supported."
        );
      } else {
        if (change.add) {
          this.state.rowAddCounter++;
          this.gSheet().appendRow(["Loading..."]);
        }
        for (const varbName of change.update) {
          this.state.rangeData.push(this.collectUpdateData(rowId, varbName));
        }
      }
    }
    const rangeData = [...this.state.rangeData];
    this.state.rangeData = [];
    return rangeData;
  }

  private collectUpdateData<VN extends VarbName<SN>>(
    rowId,
    varbName: VN
  ): DataFilterRange {
    const row = this.row(rowId);
    // inexplicably row.base1Idx is 0-indexed for this purpose
    const rowIdx = row.base1Idx - 1;
    const colIdx = this.colIdxBase1(varbName) - 1;
    return {
      dataFilter: {
        gridRange: {
          sheetId: this.schema.sheetId,
          startRowIndex: rowIdx,
          endRowIndex: rowIdx + 1,
          startColumnIndex: colIdx,
          endColumnIndex: colIdx + 1,
        },
      },
      majorDimension: "ROWS",
      values: [[row.valueStandardized(varbName)]],
    };
  }
  collectRequests(): BatchUpdateRequest[] {
    const changes = this.changesToSave;
    for (const [rowId, change] of Obj.entries(changes)) {
      if (change.delete) {
        throw new Error(
          "Not implemented. Deleting rows are not yet supported."
        );
      } else {
        if (change.add) {
          this.gSheet().appendRow(["Loading..."]);
          // this.state.batchUpdateRequests.push(this.collectAppendRequest(rowId));
        }
        for (const varbName of change.update) {
          this.state.batchUpdateRequests.push(
            this.collectUpdateRequest(rowId, varbName)
          );
        }
      }
    }
    const batchUpdateRequests = [...this.state.batchUpdateRequests];
    this.state.changesToSave = {};
    this.state.batchUpdateRequests = [];
    return batchUpdateRequests;
  }
  private collectAppendRequest<VN extends VarbName<SN>>(
    rowId
  ): BatchUpdateRequest {
    const row = this.row(rowId);
    return {
      appendCells: {
        sheetId: this.schema.sheetId,
        fields: "*",
        rows: [
          {
            values: [
              {
                userEnteredValue: {
                  stringValue: "Loading...",
                },
              },
            ],
          },
        ],
      },
    };
  }
  private collectUpdateRequest<VN extends VarbName<SN>>(
    rowId,
    varbName: VN
  ): BatchUpdateRequest {
    const row = this.row(rowId);
    // inexplicably, GAS treats indices as zero-indexed for this purpose
    const rowIdx = row.base1Idx - 1;
    const colIdx = this.colIdxBase1(varbName) - 1;
    return {
      updateCells: {
        fields: "userEnteredValue",
        rows: [
          {
            values: [{ userEnteredValue: row.valueUserEntered(varbName) }],
          },
        ],
        range: {
          sheetId: this.schema.sheetId,
          startRowIndex: rowIdx,
          endRowIndex: rowIdx + 1,
          startColumnIndex: colIdx,
          endColumnIndex: colIdx + 1,
        },
      },
    };
  }
  private collectAddData(rowId): DataFilterRange {
    const row = this.row(rowId);
    const { base1Idx } = row;
    const { headerOrder } = this.state;
    return {
      dataFilter: {
        gridRange: {
          sheetId: this.schema.sheetId,
          startRowIndex: base1Idx,
          endRowIndex: base1Idx,
          startColumnIndex: this.colIdxBase1(headerOrder[0]),
          endColumnIndex: this.colIdxBase1(headerOrder[headerOrder.length - 1]),
        },
      },
      majorDimension: "ROWS",
      values: [headerOrder.map((varbName) => row.valueStandardized(varbName))],
    };
  }
}
