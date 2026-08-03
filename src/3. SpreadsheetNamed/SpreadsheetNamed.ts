import type { TableName } from "../0. spreadsheetMetaData/4.0 tableAttributes.js";
import type { ColumnName } from "../0. spreadsheetMetaData/5. allColumnAttributes.js";
import { SpreadsheetSchema } from "../1. SpreadsheetSchema/SpreadsheetSchema.js";
import type { RowCount } from "../2. AppsScriptRaw/SheetRaw.js";

import { SpreadsheetRaw } from "../2. AppsScriptRaw/SpreadsheetRaw.js";
import type {
  InitSheetsPropsColumnsRaw,
  InitSheetsPropsRaw,
} from "../2. AppsScriptRaw/Types/RawState.js";
import { Obj } from "../utils/Obj.js";
import { SpreadsheetNamedBase } from "./ClassBases/SpreadsheetNamedBase.js";
import { SheetNamed } from "./SheetNamed.js";

type InitSheetsPropsNamed<TN extends TableName> = {
  startRowIndex: number;
  rowCount: RowCount;
  sheets: {
    [T in TN]?: "allColumns" | ColumnName<T>[];
  };
};
type NamedSheets<TN extends TableName> = {
  [T in TN]: SheetNamed<T>;
};

export class SpreadsheetNamed extends SpreadsheetNamedBase {
  static init(): SpreadsheetNamed {
    return new SpreadsheetNamed(
      SpreadsheetNamedBase.initSpreadsheetNamedProps(),
    );
  }
  get raw(): SpreadsheetRaw {
    return new SpreadsheetRaw(this.spreadsheetRawProps);
  }
  get schema(): SpreadsheetSchema {
    return this.spreadsheetSchema;
  }
  get gatheredTableNames(): TableName[] {
    return Obj.keys(this.namedState);
  }
  sheet<TN extends TableName>(tableName: TN): SheetNamed<TN> {
    return new SheetNamed({
      tableName,
      ...this.spreadsheetProps,
    });
  }
  initSheets<T extends TableName>(
    ...props: InitSheetsPropsNamed<T>[]
  ): NamedSheets<T> {
    const rawProps = this._reqSheetsPropsToRaw(props);
    this.raw.initSheets(rawProps);
    const tableNames = this._tableNamesFromReqProps(props);

    return [...tableNames].reduce((acc, tableName) => {
      acc[tableName] = this.sheet(tableName);
      return acc;
    }, {} as NamedSheets<T>);
  }
  private _reqSheetsPropsToRaw(
    propsArr: InitSheetsPropsNamed<TableName>[],
  ): InitSheetsPropsRaw[] {
    const rawPropsArr: InitSheetsPropsRaw[] = [];
    propsArr.forEach(({ startRowIndex, rowCount, sheets }) => {
      const rawProps: InitSheetsPropsRaw = {
        startRowIndex,
        rowCount,
        sheets: new Map(),
      };
      for (const tableName of Obj.keys(sheets)) {
        let columnsRaw: InitSheetsPropsColumnsRaw = "allColumns";
        if (sheets[tableName] !== "allColumns") {
          columnsRaw = sheets[tableName].map(
            (colName) => this.schema.column(tableName, colName).idxBase0,
          );
        }
        rawProps.sheets.set(this.schema.sheet(tableName).sheetGid, columnsRaw);
      }
      rawPropsArr.push(rawProps);
    });
    return rawPropsArr;
  }
  private _tableNamesFromReqProps<T extends TableName>(
    propsArr: InitSheetsPropsNamed<T>[],
  ): Set<T> {
    return propsArr.reduce((tableNames, props) => {
      return tableNames.add(...Obj.keys(props.sheets));
    }, new Set() as Set<T>);
  }
  addMissingColumnIds() {
    const sheets = this.initSheets({
      startRowIndex: this.schema.colIdRowIdx,
      rowCount: 1,
      sheets: this.schema.allTableNames.reduce(
        (acc, tableName) => {
          acc[tableName] = "allColumns";
          return acc;
        },
        {} as { [T in TableName]: "allColumns" },
      ),
    });
    // Obj.values(sheets).forEach((sheet) => sheet.raw.addMissingColumnIds());
    // Get the columnId row, check for blanks, update as needed.
  }
}
