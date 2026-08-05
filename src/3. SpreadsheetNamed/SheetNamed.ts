import type { TableName } from "../0. spreadsheetMetaData/4.0 tableAttributes";
import type {
  ColumnName,
  ColumnValue,
  TableValues,
} from "../0. spreadsheetMetaData/5. allColumnAttributes";
import type { SheetSchemaNamed } from "../1. SpreadsheetSchema/SheetSchemaNamed";
import type { RowRaw } from "../2. AppsScriptRaw/RowRaw";
import type { SheetRaw } from "../2. AppsScriptRaw/SheetRaw";
import { Arr } from "../utils/Arr";
import { SheetNamedBase } from "./ClassBases/SheetNamedBase";
import type { SheetRowToRowIdx } from "./ClassBases/SpreadsheetNamedBase";
import { RowNamed } from "./RowNamed";
import { SpreadsheetNamed } from "./SpreadsheetNamed";

export class SheetNamed<TN extends TableName> extends SheetNamedBase<TN> {
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
      ...this.sheetProps,
      id,
    });
  }
  get activeColumnNames(): ColumnName<TN>[] {
    return this.raw
      .activeColumnIdxs()
      .map((colIdx) => this.schema.columnNameByIdx(colIdx));
  }
  get idValueIdx(): number {
    return this.schema.column("id").columnIdx;
  }
  rawToNamedRow(rowRaw: RowRaw): RowNamed<TN> {
    const id = rowRaw.value(this.idValueIdx) as string;
    return this.row(id);
  }
  get topBodyRow(): RowNamed<TN> {
    return this.rawToNamedRow(this.raw.topBodyRow);
  }
  get allRows(): RowNamed<TN>[] {
    return this.raw.allRows.map((rawRow) => {
      return this.rawToNamedRow(rawRow);
    });
  }
  get dataRows(): RowNamed<TN>[] {
    return this.allRows.filter(
      (row) => row.idxBase0 >= this.schema.topBodyRowIdx,
    );
  }
  topBodyRowValue<CN extends ColumnName<TN>>(
    columnName: CN,
  ): ColumnValue<TN, CN> {
    return this.topBodyRow.value(columnName);
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
    this.raw.DELETE_ROWS(this.schema.topBodyRowIdx);
  }
  RESET_TOP_DATA_ROW_DELETE_REST() {
    if (this.raw.dataRowCount > 0) {
      this.raw.topBodyRow.resetToDefault();
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
    this.raw.DELETE_ROWS(this.schema.topBodyRowIdx + 1);
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
  state(): SheetRowToRowIdx {
    return this.namedState[this.sheetName];
  }
  appendRowDefault(): RowNamed<TN> {
    const rowId = this.schema.makeRowId();
    const rowIdx = this.raw.appendRowDefault().idxBase0;
    this.state[rowId] = rowIdx;
    return this.row(rowId);
  }
  appendRowWithVals(values: Partial<TableValues<TN>>): RowNamed<TN> {
    const row = this.appendRowDefault();
    return row.setValues(values);
  }
  addMissingColumnIds(): SheetNamed<TN> {
    const colIdRow = this.raw.row(this.schema.colIdRowIdx);
    this.raw.schema.allColumnIdxes.forEach((colIdx) => {
      const colIdValue = colIdRow.value(colIdx);
      if (!colIdValue) {
        colIdRow.setValue(colIdx, this.schema.makeColumnId());
      }
    });
    return this;
  }
  // validateThis<GN extends TnGroupName>(
  //   snGroupName: GN,
  // ): SheetNamed<GroupToTableName<GN>> {
  //   if (isInTnGroup(snGroupName, this.sheetName)) {
  //     return this as unknown as SheetNamed<GroupToTableName<GN>>;
  //   } else {
  //     throw new Error(`Not a sheet of from group "${snGroupName}"`);
  //   }
  // }
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
