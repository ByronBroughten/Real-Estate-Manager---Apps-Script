import {
  isInSnGroup,
  type GroupSectionName,
  type SectionName,
  type SnGroupName,
} from "../appSchema/1. attributes/sectionAttributes";
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
import { Arr } from "../utils/Arr";
import { Obj } from "../utils/Obj";
import {
  SheetBase,
  type ChangesToSave,
  type HeaderIndices,
  type RowChangesToSave,
  type Rows,
  type SheetState,
} from "./HandlerBases/SheetBase";
import type { SpreadsheetProps, SpreadsheetState } from "./HandlerBases/SpreadsheetBase";
import { Row } from "./Row";

type RowChangeProps<SN extends SectionName> =
  | { action: "add" | "delete" }
  | { action: "update"; varbNames: VarbName<SN>[] };

export type SheetOptions = { isAddOnly?: boolean };
export class Sheet<SN extends SectionName> extends SheetBase<SN> {
  static init<SN extends SectionName>(
    sectionName: SN,
    spreadsheetProps: SpreadsheetProps,
    options: SheetOptions = { isAddOnly: false }
  ): Sheet<SN> {
    const schema = spreadsheetProps.sectionsSchema.section(sectionName);
    const gss = spreadsheetProps.gss;

    spreadsheetProps.spreadsheetState[sectionName] = Sheet.initState(
      sectionName,
      schema,
      gss.getSheetById(
        schema.sheetId
      ),
      options
    ) as SpreadsheetState[SN];

    return new Sheet({
      sectionName: sectionName,
      ...spreadsheetProps,
    });
  }
  static initState<SN extends SectionName>(
    sectionName: SN,
    schema: SectionSchema<SN>,
    sheet: GoogleAppsScript.Spreadsheet.Sheet,
    props: { isAddOnly?: boolean }
  ): SheetState<SN> {
    const { headerRowIdxBase1, topBodyRowIdxBase1 } = schema.sections;
    
    const range = sheet.getDataRange();
    const lastColIdx = range.getLastColumn();
    const lastRowIdx = range.getLastRow();

    const headerRowRange = sheet.getRange(
      headerRowIdxBase1,
      1,
      1,
      lastColIdx
    );
    const headerValues = headerRowRange.getValues()[0];
    const trueHeaders = headerValues.filter((header) => {
      return header[0] !== "_";
    });

    const unaccountedHeaders = Arr.excludeStrict(
      trueHeaders,
      schema.varbDisplayNames()
    );
    const isAddSafe = unaccountedHeaders.length === 0;
    const isAddOnly = props.isAddOnly || false;
    if (isAddOnly && !isAddSafe) {
      throw new Error(
        "Sheet is addOnly but not addSafe. Not enough varbNames for columns."
      );
    }
    const headerIndices = this.getVarbNameIndicesBase1(
      schema,
      headerValues
    );
    const headerOrder = [...schema.varbNames].sort(
      (a, b) => headerIndices[a] - headerIndices[b]
    );
    const idIndexBase1 = headerIndices.id;

    let bodyRowOrder = [];
    const numRows = lastRowIdx - topBodyRowIdxBase1 + 1;
    const areRows = numRows > 0;
    if (areRows) {
      const bodyRowIdRange = sheet.getRange(
        topBodyRowIdxBase1,
        idIndexBase1,
        lastRowIdx - topBodyRowIdxBase1 + 1,
        1
      );
      const bodyRowIdValues = bodyRowIdRange.getValues();
      bodyRowOrder = bodyRowIdValues.map((row) => row[0]);
      if (Arr.hasDuplicates(bodyRowOrder)) {
        throw new Error(`Sheet "${sectionName}" has duplicate row IDs.`);
      }
    }

    const bodyRows: Rows<SN> = {};
    if (!isAddOnly && areRows) {
      const columns = {} as { [VN in VarbName<SN>]: VarbValue<SN, VN>[] };
      for (const varbName of schema.varbNames) {
        const column = sheet.getRange(
          topBodyRowIdxBase1,
          headerIndices[varbName],
          lastRowIdx,
          1
        );
        const columnValues = column.getValues();
        columns[varbName] = columnValues.map((row) => row[0]);
      }
      for (let i = 0; i < bodyRowOrder.length; i++) {
        const rowId = bodyRowOrder[i];
        const rowValues = schema.varbNames.reduce((values, varbName) => {
          const value = columns[varbName][i];
          values[varbName] = value as SectionValues<SN>[typeof varbName];
          return values;
        }, {} as SectionValues<SN>);
        bodyRows[rowId] = rowValues;
      }
    }
    return {
      sheetName: sheet.getName(),
      unaccountedHeaders,
      isAddOnly,
      headerIndicesBase1: headerIndices,
      headerOrder,
      bodyRows,
      bodyRowOrder,
      changesToSave: {},
    };
  }
  private static getVarbNameIndicesBase1<SN extends SectionName>(
    schema: SectionSchema<SN>,
    headers: string[]
  ): HeaderIndices<SN> {
    const indicesBase1: HeaderIndices<SN> = {} as HeaderIndices<SN>;
    for (const varbName of schema.varbNames) {
      const { displayName } = schema.varb(varbName);
      const colIdx = headers.indexOf(displayName);
      if (colIdx === -1) {
        throw new Error(
          `Header "${displayName}" not found in sheet for section ${schema.sectionName}`
        );
      }
      indicesBase1[varbName] = colIdx + 1;
    }
    return indicesBase1;
  }
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
  get isAddSafe(): boolean {
    return this.state.unaccountedHeaders.length === 0;
  }
  sort(varbName: VarbName<SN>): void {
    this.sortAscWithoutAddingChanges(varbName);
    this.addAllVarbsAsChanges();
  }
  sortAscWithoutAddingChanges(varbName: VarbName<SN>): void {
    this.state.bodyRowOrder.sort((a, b) => {
      return Arr.compareForSort(
        this.row(a).value(varbName),
        this.row(b).value(varbName)
      );
    });
  }
  validateThis<GN extends SnGroupName>(
    snGroupName: GN
  ): Sheet<GroupSectionName<GN>> {
    if (isInSnGroup(snGroupName, this.sectionName)) {
      return this as unknown as Sheet<GroupSectionName<GN>>;
    } else {
      throw new Error(`Not a sheet of from group "${snGroupName}"`);
    }
  }
  isApiEnterTriggered(e: { colIdxBase1: number; rowIdxBase1: number }) {
    const api = this.validateThis("api");
    const header = api.headerByColIdxBase1(e.colIdxBase1);
    const isTopBodyRow = e.rowIdxBase1 === api.topBodyRowIdxBase1
    const isEnter = header.slice(0, 5) === "Enter"
    return isTopBodyRow && isEnter;
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
  addChangeToSave(rowId: string, rowChange: RowChangeProps<SN>) {
    if (!this.changesToSave[rowId]) {
      this.changesToSave[rowId] = this.createRowChanges();
    }
    const changes = this.changesToSave[rowId];

    if (rowChange.action === "update") {
      for (const varbName of rowChange.varbNames) {
        changes.update.add(varbName);
      }
    } else if (rowChange.action === "add") {
      changes.add = true;
    } else if (rowChange.action === "delete") {
      changes.delete = true;
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
  headerByColIdxBase1(colIdxBase1: number): string {
    const varbName = this.varbNameByColIdxBase1(colIdxBase1);
    const header = this.schema.varb(varbName).displayName;
    return header;
  }
  varbNameByColIdxBase1(colIdxBase1: number): VarbName<SN> {
    const varbName = this.state.headerOrder[colIdxBase1 - 1];
    if (!varbName) {
      throw new Error(
        `No variable found at column index ${colIdxBase1} in sheet "${this.sectionName}"`
      );
    }
    return varbName;
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
    if (!this.isAddSafe) {
      throw new Error(
        `Sheet "${
          this.sectionName
        }" is not add safe. There are no corresponding variables for the following column headers: ${this.state.unaccountedHeaders.join(
          ", "
        )}.`
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
    const rangeData: DataFilterRange[] = [];
    for (const [rowId, change] of Obj.entries(changes)) {
      if (change.delete) {
        throw new Error(
          "Not implemented. Deleting rows are not yet supported."
        );
      } else {
        if (change.add) {
          this.gSheet().appendRow(["Loading..."]);
        }
        for (const varbName of change.update) {
          rangeData.push(this.collectUpdateData(rowId, varbName));
        }
      }
    }
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
    const batchUpdateRequests = [];
    for (const [rowId, change] of Obj.entries(changes)) {
      if (change.delete) {
        throw new Error(
          "Not implemented. Deleting rows are not yet supported."
        );
      } else {
        if (change.add) {
          this.gSheet().appendRow(["Loading..."]);
          // batchUpdateRequests.push(this.collectAppendRequest(rowId));
        }
        for (const varbName of change.update) {
          batchUpdateRequests.push(
            this.collectUpdateRequest(rowId, varbName)
          );
        }
      }
    }
    this.state.changesToSave = {};
    return batchUpdateRequests;
  }
  // private collectDeleteRequest(rowId): BatchUpdateRequest {}
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
