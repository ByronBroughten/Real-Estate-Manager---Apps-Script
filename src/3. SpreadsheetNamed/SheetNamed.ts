import type { SheetName } from "../1.0 Configs/2.0 sheetConfigs";
import type {
  ColumnName,
  ColumnValue,
  TableValues,
} from "../1.0 Configs/3.0 columnConfigs";
import type { RowRaw } from "../2. AppsScriptRaw/RowRaw";
import type { SheetRaw } from "../2. AppsScriptRaw/SheetRaw";
import type { SheetSchemaNamed } from "../2.0 Schemas/SheetSchemaNamed";
import { Arr } from "../utils/Arr";
import { SheetNamedBase } from "./ClassBases/SheetNamedBase";
import { ColumnNamed } from "./ColumnNamed";
import { RowNamed } from "./RowNamed";
import { SpreadsheetNamed } from "./SpreadsheetNamed";
import type { RowIdsToIndexes } from "./Types/NamedState";

export class SheetNamed<TN extends SheetName> extends SheetNamedBase<TN> {
  get spreadsheet(): SpreadsheetNamed {
    return new SpreadsheetNamed(this.spreadsheetNamedProps);
  }
  get schema(): SheetSchemaNamed<TN> {
    return this.spreadsheetSchema.sheet(this.sheetName);
  }
  get raw(): SheetRaw {
    return this.spreadsheet.raw.sheet(this.schema.sheetGid);
  }
  row(id: string): RowNamed<TN> {
    return new RowNamed({
      ...this.sheetNamedProps,
      id,
    });
  }
  column<CN extends ColumnName<TN>>(columnName: CN): ColumnNamed<TN, CN> {
    return new ColumnNamed({
      ...this.sheetNamedProps,
      columnName,
    });
  }
  get topDataRow(): RowNamed<TN> {
    return this.rawToNamedRow(this.raw.topDataRow);
  }
  get activeRows(): RowNamed<TN>[] {
    return this.raw.activeRows.map((rawRow) => {
      return this.rawToNamedRow(rawRow);
    });
  }
  get dataRows(): RowNamed<TN>[] {
    return this.activeRows.filter(
      (row) => row.rowIndex >= this.schema.topDataRowIdx,
    );
  }
  get headerRow(): RowNamed<TN> {
    return this.rawToNamedRow(this.raw.headerRow);
  }
  get colIdRow(): RowNamed<TN> {
    return this.rawToNamedRow(this.raw.colIdRow);
  }
  get actionRow(): RowNamed<TN> {
    return this.rawToNamedRow(this.raw.actionRow);
  }
  removeRowsExcept(...rowIdsToKeep: string[]): SheetNamed<TN> {
    const rowsToKeep = rowIdsToKeep.map((rowId) => this.row(rowId));
    this.raw.removeRowsExcept(...rowsToKeep.map((row) => row.rowIndex));
    this.namedState.sheetRowIdsToIndexes[this.sheetName] = rowsToKeep.reduce(
      (acc, row) => {
        acc[row.id] = row.rowIndex;
        return acc;
      },
      {} as RowIdsToIndexes,
    );
    return this;
  }
  get activeColumnNames(): ColumnName<TN>[] {
    return this.raw.activeColumnIdxs.map((colIdx) =>
      this.schema.columnNameByIdx(colIdx),
    );
  }
  get idValueIdx(): number {
    return this.schema.column("id").colIndex;
  }
  rawToNamedRow(rowRaw: RowRaw): RowNamed<TN> {
    const id = rowRaw.value(this.idValueIdx) as string;
    return this.row(id);
  }
  topDataRowValue<CN extends ColumnName<TN>>(
    columnName: CN,
  ): ColumnValue<TN, CN> {
    return this.topDataRow.value(columnName);
  }
  sortRowsbyColumnName(
    rows: RowNamed<TN>[],
    columnName: ColumnName<TN>,
  ): RowNamed<TN>[] {
    return rows.sort((a, b) => {
      return Arr.compareForSort(a.value(columnName), b.value(columnName));
    });
  }
  DELETE_ALL_DATA_ROWS(): SheetNamed<TN> {
    if (this.raw.dataRowCount < 1) {
      return this;
    }
    this.dataRows.forEach((row) => {
      delete this.state[row.id];
    });
    this.raw.DELETE_ACTIVE_ROWS(this.schema.topDataRowIdx);
  }
  RESET_TOP_DATA_ROW_DELETE_REST() {
    if (this.raw.dataRowCount > 0) {
      this.raw.topDataRow.setDataRowToDefault();
    }
    if (this.raw.dataRowCount > 1) {
      this.DELETE_DATA_ROWS_AFTER_TOP();
    }
  }
  private DELETE_DATA_ROWS_AFTER_TOP() {
    this.dataRows.forEach((row, idx) => {
      if (idx === 0) {
        return; // skip the top row
      }
      delete this.state[row.id];
    });
    this.raw.DELETE_ACTIVE_ROWS(this.schema.topDataRowIdx + 1);
  }
  rowsFiltered(values: Partial<TableValues<TN>>): RowNamed<TN>[] {
    return this.dataRows.filter((row) => {
      for (const columnName in values) {
        if (row.value(columnName) !== values[columnName]) {
          return false;
        }
      }
      return true;
    });
  }
  get state(): RowIdsToIndexes {
    return this.namedState.sheetRowIdsToIndexes[this.sheetName];
  }
  appendRowDefault(): RowNamed<TN> {
    const rowId = this.raw.schema.makeRowId();
    const rowIndex = this.raw.appendRowDefault().rowIndex;
    this.state[rowId] = rowIndex;
    return this.row(rowId);
  }
  appendRowWithVals(values: Partial<TableValues<TN>>): RowNamed<TN> {
    const row = this.appendRowDefault();
    return row.setValues(values);
  }
}

const appendReq: GoogleAppsScript.Sheets.Schema.AppendCellsRequest = {
  sheetId: 0,
  rows: [
    {
      values: [
        {
          userEnteredValue: {
            stringValue: "New RowNamed Entry",
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
