import type { TableName } from "../0. spreadsheetMetaData/4.0 tableAttributes.js";
import type { ColumnName } from "../0. spreadsheetMetaData/5. columnAttributes.js";
import { SpreadsheetSchema } from "../1. SpreadsheetSchema/SpreadsheetSchema.js";

import { SpreadsheetRaw } from "../2. AppsScriptRaw/SpreadsheetRaw.js";
import { Obj } from "../utils/Obj.js";
import {
  SpreadsheetNamedBase,
  type SpreadsheetState,
} from "./ClassBases/SpreadsheetNamedBase.js";
import { SheetNamed, type SheetOptions } from "./SheetNamed.js";

type RowCount = "noRows" | "oneRow" | "allRows";
type ReqSheetsProps = {
  [RC in RowCount]?: {
    [TN in TableName]?: ColumnName<TN>[];
  };
};

export class SpreadsheetNamed extends SpreadsheetNamedBase {
  static init(): SpreadsheetNamed {
    return new SpreadsheetNamed({
      namedState: {
        spreadsheetTables: {} as SpreadsheetState,
        spreadsheetSchema: new SpreadsheetSchema(),
      },
      rawState: SpreadsheetRaw.initRawState(),
    });
  }
  private batchGet(tableNames: TableName[]) {
    // This defines which sheets you will need.
    // If you want to get fancy, you can make it define which columns you'll need
  }
  get raw(): SpreadsheetRaw {
    return new SpreadsheetRaw(this.spreadsheetRawProps);
  }
  get state(): SpreadsheetState {
    return this.spreadsheetTables;
  }
  get schema(): SpreadsheetSchema {
    return this.spreadsheetSchema;
  }

  get tableNames(): TableName[] {
    return Obj.keys(this.state);
  }
  sheet<TN extends TableName>(
    tableName: TN,
    options?: SheetOptions,
  ): SheetNamed<TN> {
    if (!this.tableNames.includes(tableName)) {
      return SheetNamed.init(tableName, this.spreadsheetProps, options);
    } else {
      return new SheetNamed({
        tableName,
        ...this.spreadsheetProps,
      });
    }
  }
  gatherRequestsAndBatchUpdate() {
    this.raw.batchUpdateByRequests(this.gatherRequests());
  }
  private gatherRequests(): BatchUpdateRequest[] {
    const requests: BatchUpdateRequest[] = [];
    for (const tableName of this.tableNames) {
      const sheet = this.sheet(tableName);
      requests.push(...sheet.collectRequests());
    }
    return requests;
  }
  reqSheets() {
    type RowCount = "noRows" | "oneRow" | "allRows";
    type ReqSheetsProps = {
      [RC in RowCount]?: {
        [TN in TableName]?: ColumnName<TN>[];
      };
    };

    function test<P extends ReqSheetsProps>(props: P): P {
      return props;
    }

    test({
      allRows: {
        property: ["bedroomCount", "closingDate"],
      },
      noRows: {},
    });
  }
  appendTableAttributes() {
    const metaTableSchema = this.schema.table("allTableAttributes" as const);
    const spreadsheetId = this.gss.getId();

    this.raw.initSheets();
    const atrSheetRaw = this.raw.sheet(metaTableSchema.sheetGid);

    // initSheets()
    // If I had the title right away

    // 2) Full cell data for just the "All Table Attributes" sheet.
    const dataResponse = Sheets.Spreadsheets.get(spreadsheetId, {
      ranges: [atrSheetRaw.title],
      fields: "sheets(data(rowData(values(formattedValue))))",
    });

    const attrSheetData = (dataResponse.sheets || [])[0];
    const rowData =
      (attrSheetData &&
        attrSheetData.data &&
        attrSheetData.data[0] &&
        attrSheetData.data[0].rowData) ||
      [];

    // Determine column positions from the header row (robust to column order).
    const colIdIdx = this.schema.columnIdRowIdxBase0;
    const colIdRow = rowData[colIdIdx];
    const colIds = ((colIdRow && colIdRow.values) || []).map(
      (v) => (v && v.formattedValue) || "",
    );
    const gidColIdx = colIds.indexOf(
      metaTableSchema.column("sheetGid").columnId,
    );
    const nameColIdx = colIds.indexOf(
      metaTableSchema.column("tableName").columnId,
    );
    const prefixColIdx = colIds.indexOf(
      metaTableSchema.column("idPrefix").columnId,
    );

    if (gidColIdx === -1 || nameColIdx === -1 || prefixColIdx === -1) {
      throw new Error(
        `Could not locate expected headers on "${metaTableSchema.tableName}".`,
      );
    }

    // Collect GIDs already described in the table's data rows.
    const attrTable = attrTables[0];
    const attrTableRange = attrTable.range;
    const lastDataRowExclusive =
      attrTableRange.endRowIndex !== undefined
        ? attrTableRange.endRowIndex
        : rowData.length;

    const existingGIDs = new Set();
    for (
      let r = this.schema.topBodyRowIdxBase0;
      r < lastDataRowExclusive;
      r++
    ) {
      const row = rowData[r];
      const cell = row && row.values && row.values[gidColIdx];
      if (
        cell &&
        cell.formattedValue !== undefined &&
        cell.formattedValue !== ""
      ) {
        existingGIDs.add(Number(cell.formattedValue));
      }
    }

    // Find every table in the spreadsheet whose sheet GID isn't yet described.
    const missing = [];
    sheets.forEach((sheet) => {
      const tables = sheet.tables || [];
      if (tables.length === 0) return;
      const sheetId = sheet.properties.sheetId;
      if (existingGIDs.has(sheetId)) return;
      // Per spec, exactly one table per sheet; describe it.
      missing.push({ sheetId: sheetId, tableName: attrTable.name });
    });

    if (missing.length === 0) {
      Logger.log(
        `No missing tables found. "${metaTableSchema.tableName}" is already up to date.`,
      );
      return;
    }

    // Build AppendCellsRequest rows, placing values in the correct columns
    // regardless of header order, leaving "ID prefix" blank.
    const width = Math.max(gidColIdx, nameColIdx, prefixColIdx) + 1;
    const rowsToAppend = missing.map((m) => {
      const values = new Array(width).fill(null).map(() => ({}));
      values[gidColIdx] = { userEnteredValue: { numberValue: m.sheetId } };
      values[nameColIdx] = { userEnteredValue: { stringValue: m.tableName } };
      // values[prefixColIdx] intentionally left as {} (blank) for manual entry.
      return { values: values };
    });

    Sheets.Spreadsheets.batchUpdate(
      {
        requests: [
          {
            appendCells: {
              sheetId: metaTableSchema.sheetGid,
              tableId: attrTable.tableId,
              rows: rowsToAppend,
              fields: "userEnteredValue",
            },
          },
        ],
      },
      spreadsheetId,
    );

    Logger.log(
      `Appended ${missing.length} missing table row(s) to "${metaTableSchema.tableName}": ${missing.map((m) => m.sheetId + " (" + m.tableName + ")").join(", ")}`,
    );
  }
}
