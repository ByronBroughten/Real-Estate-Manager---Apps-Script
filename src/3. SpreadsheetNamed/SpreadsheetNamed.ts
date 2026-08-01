import type { TableName } from "../0. spreadsheetMetaData/4.0 tableAttributes.js";
import type { ColumnName } from "../0. spreadsheetMetaData/5. allColumnAttributes.js";
import { SpreadsheetSchema } from "../1. SpreadsheetSchema/SpreadsheetSchema.js";

import {
  SpreadsheetRaw,
  type RowsSheetsReqPropsRaw,
} from "../2. AppsScriptRaw/SpreadsheetRaw.js";
import type { GoogleUpdateRequests } from "../2. AppsScriptRaw/Types/AppsScriptTypes.js";
import { Obj } from "../utils/Obj.js";
import {
  SpreadsheetNamedBase,
  type SpreadsheetState,
} from "./ClassBases/SpreadsheetNamedBase.js";
import { SheetNamed, type SheetOptions } from "./SheetNamed.js";

type RowCount = "noRows" | "oneRow" | "allRows";
type RowsSheetsDataReqProps<TN extends TableName> = {
  [RC in RowCount]?: {
    [T in TN]?: ColumnName<T>[];
  };
};

type RowsSheetsReqPropsNext<TN extends TableName> = {
  rowCount: RowCount;
  startRowIndex?: number;
  sheets: {
    [T in TN]?: "allColumns" | ColumnName<T>[];
  };
}[];

type NamedSheets<TN extends TableName> = {
  [T in TN]: SheetNamed<T>;
};

export class SpreadsheetNamed extends SpreadsheetNamedBase {
  static init(): SpreadsheetNamed {
    return new SpreadsheetNamed({
      namedState: {
        spreadsheetTables: {} as SpreadsheetState,
        spreadsheetSchema: new SpreadsheetSchema(),
        colIdToIdx: {},
        rowIdToIdx: {},
      },
      rawState: SpreadsheetRaw.initRawState(),
    });
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
  private gatherRequests(): GoogleUpdateRequests[] {
    const requests: GoogleUpdateRequests[] = [];
    for (const tableName of this.tableNames) {
      const sheet = this.sheet(tableName);
      requests.push(...sheet.collectRequests());
    }
    return requests;
  }

  // So... there's initSheets and there's initDataSheets.
  // initDataSheets needs to have a rowCount, etc.
  initSheets<T extends TableName>(
    props: RowsSheetsDataReqProps<T>,
  ): NamedSheets<T> {
    const rawProps = this._reqSheetsPropsToRaw(props);
    this.raw.initSheets(rawProps);
    const tableNames = this._tableNamesFromReqProps(props);
    return tableNames.reduce((acc, tableName) => {
      acc[tableName] = this.sheet(tableName);
      return acc;
    }, {} as NamedSheets<T>);
  }
  initDataSheets<T extends TableName>(
    props: RowsSheetsDataReqProps<T>,
  ): NamedSheets<T> {
    const rawProps = this._reqSheetsPropsToRaw(props);
    this.raw.initSheets(rawProps);
    const tableNames = this._tableNamesFromReqProps(props);
    return tableNames.reduce((acc, tableName) => {
      acc[tableName] = this.sheet(tableName);
      return acc;
    }, {} as NamedSheets<T>);
  }
  private _reqSheetsPropsToRaw(
    props: RowsSheetsDataReqProps<TableName>,
  ): RowsSheetsReqPropsRaw {
    const rawProps: RowsSheetsReqPropsRaw = new Map();
    for (const rowCount of Obj.keys(props)) {
      const sheets = props[rowCount];
      if (!sheets) continue;
      const rowCountRaw =
        rowCount === "noRows" ? 0 : rowCount === "oneRow" ? 1 : "allFromStart";
      for (const tableName of Obj.keys(sheets)) {
        const colNames = sheets[tableName];
        if (!colNames) continue;
        const sheetGid = this.schema.sheet(tableName).sheetGid;
        const colIdxes = colNames.map(
          (colName) => this.schema.column(tableName, colName).idxBase0,
        );
        rawProps.set(rowCountRaw, new Map([[sheetGid, colIdxes]]));
      }
    }
    return rawProps;
  }
  private _tableNamesFromReqProps<T extends TableName>(
    props: RowsSheetsDataReqProps<T>,
  ): T[] {
    return Obj.keys(props).reduce((acc, rowCount) => {
      const sheets = props[rowCount];
      if (!sheets) return acc;
      for (const tableName of Obj.keys(sheets)) {
        if (!acc.includes(tableName)) {
          acc.push(tableName);
        }
      }
      return acc;
    }, [] as T[]);
  }
  ensureColumnIds() {
    const rawSs = this.raw;

    rawSs.schema.allSheetGids.forEach((sheetGid) => {
      rawSs.sheet(sheetGid).gatherGetRequest({
        startRowIndex: rawSs.schema.colIdRowIdx,
        rowCount: 1,
        startColumnIndex: 0,
        howManyColumns: rawSs.schema.columnCount,
      });
    });
  }
}
