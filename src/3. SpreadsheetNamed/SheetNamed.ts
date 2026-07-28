import { spreadsheetConfig } from "../0. spreadsheetMetaData/1. spreadsheetConfig";
import type { TableName } from "../0. spreadsheetMetaData/4.0 tableAttributes";
import type {
  GroupToTableName,
  TnGroupName,
} from "../0. spreadsheetMetaData/4.1 tableNameGroups";
import type {
  ColumnName,
  ColumnValue,
  TableValues,
} from "../0. spreadsheetMetaData/5. columnAttributes";
import type { SheetSchema } from "../1. SpreadsheetSchema/SheetSchema";
import type { BatchUpdateRequest } from "../2. AppsScriptRaw/ClassBases/SpreadsheetRawBase";
import type { SheetRaw } from "../2. AppsScriptRaw/SheetRaw";
import { Arr } from "../utils/Arr";
import { Obj } from "../utils/Obj";
import {
  SheetNamedBase,
  type ChangesToSave,
  type HeaderIndices,
  type RowChangesToSave,
  type Rows,
  type SheetState,
} from "./ClassBases/SheetNamedBase";
import type {
  SpreadsheetNamedProps,
  SpreadsheetState,
} from "./ClassBases/SpreadsheetNamedBase";
import { Row } from "./RowNamed";
import { SpreadsheetNamed } from "./SpreadsheetNamed";

type RowChangeProps<TN extends TableName> =
  | { action: "add" | "delete" }
  | { action: "update"; columnNames: ColumnName<TN>[] };

export type SheetOptions = { isAddOnly?: boolean };
export class SheetNamed<TN extends TableName> extends SheetNamedBase<TN> {
  get spreadsheet(): SpreadsheetNamed {
    return new SpreadsheetNamed(this.spreadsheetProps);
  }
  get raw(): SheetRaw {
    const schema = this.spreadsheetSchema.table(this.tableName);
    return this.spreadsheet.raw.sheet(schema.sheetGid);
  }
  static init<TN extends TableName>(
    tableName: TN,
    spreadsheetProps: SpreadsheetNamedProps,
    options: SheetOptions = { isAddOnly: false },
  ): SheetNamed<TN> {
    const { spreadsheetSchema, spreadsheetTables } =
      spreadsheetProps.namedState;
    const { gss } = spreadsheetProps.rawState;
    const schema = spreadsheetSchema.table(tableName);

    spreadsheetTables[tableName] = SheetNamed.initState(
      tableName,
      schema,
      gss.getSheetById(schema.sheetGid),
      options,
    ) as SpreadsheetState[TN];

    return new SheetNamed({
      tableName: tableName,
      ...spreadsheetProps,
    });
  }
  static initState<TN extends TableName>(
    tableName: TN,
    schema: SheetSchema<TN>,
    sheet: GoogleAppsScript.Spreadsheet.Sheet,
    props: { isAddOnly?: boolean },
  ): SheetState<TN> {
    const { topBodyRowIdxBase1 } = schema.spreadsheet.table(tableName);

    const range = sheet.getDataRange();
    const lastColIdx = range.getLastColumn();
    const lastRowIdx = range.getLastRow();
    const headerRowRange = sheet.getRange(
      spreadsheetConfig.headerRowIdxBase1,
      1,
      1,
      lastColIdx,
    );
    const headerValues = headerRowRange.getValues()[0];
    const trueHeaders = headerValues.filter((header) => {
      return header[0] !== "_";
    });

    const unaccountedHeaders = Arr.excludeStrict(
      trueHeaders,
      schema.varbDisplayNames(),
    );
    const isAddSafe = unaccountedHeaders.length === 0;
    const isAddOnly = props.isAddOnly || false;
    if (isAddOnly && !isAddSafe) {
      throw new Error(
        "SheetNamed is addOnly but not addSafe. Not enough columnNames for columns.",
      );
    }
    const headerIndices = this.getVarbNameIndicesBase1(schema, headerValues);
    const idIndexBase1 = headerIndices.id;

    let bodyRowOrder = [];
    const numRows = lastRowIdx - topBodyRowIdxBase1 + 1;
    const areRows = numRows > 0;
    if (areRows) {
      const bodyRowIdRange = sheet.getRange(
        topBodyRowIdxBase1,
        idIndexBase1,
        lastRowIdx - topBodyRowIdxBase1 + 1,
        1,
      );
      const bodyRowIdValues = bodyRowIdRange.getValues();
      bodyRowOrder = bodyRowIdValues.map((row) => row[0]);
      if (Arr.hasDuplicates(bodyRowOrder)) {
        throw new Error(`SheetNamed "${tableName}" has duplicate row IDs.`);
      }
    }

    const bodyRows: Rows<TN> = {};
    if (!isAddOnly && areRows) {
      const columns = {} as { [CN in ColumnName<TN>]: ColumnValue<TN, CN>[] };
      for (const columnName of schema.columnNames) {
        const column = sheet.getRange(
          topBodyRowIdxBase1,
          headerIndices[columnName],
          lastRowIdx,
          1,
        );
        const columnValues = column.getValues();
        columns[columnName] = columnValues.map((row) => row[0]);
      }
      for (let i = 0; i < bodyRowOrder.length; i++) {
        const rowId = bodyRowOrder[i];
        const rowValues = schema.columnNames.reduce((values, columnName) => {
          const value = columns[columnName][i];
          values[columnName] = value as TableValues<TN>[typeof columnName];
          return values;
        }, {} as TableValues<TN>);
        bodyRows[rowId] = rowValues;
      }
    }
    return {
      sheetName: sheet.getName(),
      unaccountedHeaders,
      isAddOnly,
      headerIndicesBase1: headerIndices,
      bodyRows,
      bodyRowOrder,
      changesToSave: {},
    };
  }
  getLiteralTextOrFormula() {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const cell = sheet.getRange("A1"); // Change to your target cell

    // 1. Try to get the formula string (e.g., "=SUM(B1:B10)")
    let literalText = cell.getFormula();

    // 2. If it's not a formula, get the raw cell value or literal text
    if (!literalText) {
      literalText = cell.getValue();
    }

    Logger.log(literalText);
    return literalText;
  }
  private static getVarbNameIndicesBase1<TN extends TableName>(
    schema: SheetSchema<TN>,
    headers: string[],
  ): HeaderIndices<TN> {
    const indicesBase1: HeaderIndices<TN> = {} as HeaderIndices<TN>;
    for (const columnName of schema.columnNames) {
      const { displayName } = schema.column(columnName);
      const colIdx = headers.indexOf(displayName);
      if (colIdx === -1) {
        throw new Error(
          `Header "${displayName}" not found in sheet for section ${schema.tableName}`,
        );
      }
      indicesBase1[columnName] = colIdx + 1;
    }
    return indicesBase1;
  }
  get state(): SheetState<TN> {
    return this.sheetState;
  }
  get schema(): SheetSchema<TN> {
    return this.tableSchema;
  }
  colIdxBase1<CN extends ColumnName<TN>>(columnName: CN): number {
    return this.state.headerIndicesBase1[columnName];
  }
  row(id: string): Row<TN> {
    const idxBase1Base = this.sheetState.bodyRowOrder.indexOf(id);
    const idxBase1 = idxBase1Base + this.topBodyRowIdxBase1;
    if (idxBase1Base === -1) {
      throw new Error(
        `Row with id "${id}" not found in sheet "${this.tableName}"`,
      );
    }
    return new Row({
      ...this.sheetProps,
      id,
    });
  }
  get orderedRows(): Row<TN>[] {
    return this.state.bodyRowOrder.map((id) => this.row(id));
  }
  get rows(): Rows<TN> {
    return this.state.bodyRows;
  }
  get lastRowIdx(): number {
    return this.state.bodyRowOrder.length - 1;
  }
  get columnNames(): ColumnName<TN>[] {
    return this.schema.columnNames;
  }
  get changesToSave(): ChangesToSave<TN> {
    return this.state.changesToSave;
  }
  get isAddSafe(): boolean {
    return this.state.unaccountedHeaders.length === 0;
  }
  sort(columnName: ColumnName<TN>): void {
    this.sortAscWithoutAddingChanges(columnName);
    this.addAllVarbsAsChanges();
  }
  private sortAscWithoutAddingChanges(columnName: ColumnName<TN>): void {
    this.state.bodyRowOrder.sort((a, b) => {
      return Arr.compareForSort(
        this.row(a).value(columnName),
        this.row(b).value(columnName),
      );
    });
  }
  validateThis<GN extends TnGroupName>(
    snGroupName: GN,
  ): SheetNamed<GroupToTableName<GN>> {
    if (isInTnGroup(snGroupName, this.tableName)) {
      return this as unknown as SheetNamed<GroupToTableName<GN>>;
    } else {
      throw new Error(`Not a sheet of from group "${snGroupName}"`);
    }
  }
  addAllVarbsAsChanges(): void {
    this.orderedRows.forEach((row) => row.addAllVarbsAsChanges());
  }
  DELETE_ALL_BODY_ROWS() {
    if (this.state.bodyRowOrder.length > 0) {
      this.raw.deleteRows(
        this.topBodyRowIdxBase1,
        this.state.bodyRowOrder.length,
      );
      this.state.bodyRowOrder = [];
      this.state.bodyRows = {};
    }
  }
  addChangeToSave(rowId: string, rowChange: RowChangeProps<TN>) {
    if (!this.changesToSave[rowId]) {
      this.changesToSave[rowId] = this.createRowChanges();
    }
    const changes = this.changesToSave[rowId];

    if (rowChange.action === "update") {
      for (const columnName of rowChange.columnNames) {
        const varbSchema = this.schema.column(columnName);
        if (!varbSchema.isEquationLiteral) {
          changes.update.add(columnName);
        }
      }
    } else if (rowChange.action === "add") {
      changes.add = true;
    } else if (rowChange.action === "delete") {
      changes.delete = true;
    } else {
      throw new Error(`Unknown rowChange action: ${rowChange.action}`);
    }
  }
  private createRowChanges<TN extends TableName>(): RowChangesToSave<TN> {
    return {
      add: false,
      delete: false,
      update: new Set(),
    };
  }
  headerByColIdxBase1(colIdxBase1: number): string {
    const columnName = this.varbNameByColIdxBase1(colIdxBase1);
    const header = this.schema.column(columnName).displayName;
    return header;
  }
  varbNameByColIdxBase1(colIdxBase1: number): ColumnName<TN> {
    const columnName = Obj.keyByValue(
      this.state.headerIndicesBase1,
      colIdxBase1,
    );
    if (!columnName) {
      throw new Error(
        `No variable found at column index ${colIdxBase1} in sheet "${this.tableName}"`,
      );
    }
    return columnName;
  }
  rowsFiltered(values: Partial<TableValues<TN>>): Row<TN>[] {
    return this.orderedRows.filter((row) => {
      for (const columnName in values) {
        if (row.value(columnName) !== values[columnName]) {
          return false;
        }
      }
      return true;
    });
  }
  get topBodyRow() {
    return this.row(this.state.bodyRowOrder[0]);
  }
  topBodyRowValue<CN extends ColumnName<TN>>(
    columnName: CN,
  ): ColumnValue<TN, CN> {
    return this.topBodyRow.value(columnName);
  }
  addRowDefault(): string {
    if (!this.isAddSafe) {
      throw new Error(
        `SheetNamed "${
          this.tableName
        }" is not add safe. There are no corresponding variables for the following column headers: ${this.state.unaccountedHeaders.join(
          ", ",
        )}.`,
      );
    }

    const { baseId, fullId } = this.schema.makeSectionIds();
    const rowId = fullId;
    this.rows[rowId] = {} as TableValues<TN>;
    this.state.bodyRowOrder.push(rowId);
    this.addChangeToSave(rowId, { action: "add" });
    const row = this.row(rowId);
    row.setValue("baseId", baseId);
    row.resetToDefault();
    return rowId;
  }
  addRowWithValues(values: Partial<TableValues<TN>>): string {
    const rowId = this.addRowDefault();
    const row = this.row(rowId);
    row.setValues(values);
    return rowId;
  }
  collectRequests(): BatchUpdateRequest[] {
    const changes = this.changesToSave;
    const batchUpdateRequests = [];
    const batchDeleteRequests = [];
    const batchAppendRequests = {};
    for (const [rowId, change] of Obj.entries(changes)) {
      const row = this.row(rowId);
      if (change.delete) {
        batchDeleteRequests.push(row.raw.deleteRequest);
      } else {
        if (change.add) {
          this.raw.appendRow(["Loading..."]);
          // batchUpdateRequests.push(this.collectAppendRequest(rowId));
          change.add;
        }
        for (const columnName of change.update) {
          batchUpdateRequests.push(row.makeUpdateRequest(columnName));
        }
      }
    }
    this.state.changesToSave = {};
    // Delete requests must be carried out after update requests, because row indices will change after deletions.
    return [...batchUpdateRequests, ...batchDeleteRequests];
  }
}

const appendReq: GoogleAppsScript.Sheets.Schema.AppendCellsRequest = {
  sheetId: 0,
  rows: [
    {
      values: [
        {
          userEnteredValue: {
            stringValue: "New Row Entry",
          },
        },
      ],
    },
  ],
  fields: "userEnteredValue",
};

const updateReq: GoogleAppsScript.Sheets.Schema.UpdateTableRequest = {
  table: {
    tableId: "1001",
    name: "Updated_Table_Name",
  },
  fields: "name",
};

// 4. Passing in batchUpdate
const batchRequest: GoogleAppsScript.Sheets.Schema.BatchUpdateSpreadsheetRequest =
  {
    requests: [{ updateTable: updateReq }, { appendCells: appendReq }],
  };
