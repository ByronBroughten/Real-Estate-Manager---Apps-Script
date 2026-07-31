import {
  configGet,
  spreadsheetConfig,
  type SpreadsheetConfig,
} from "../0. spreadsheetMetaData/1. spreadsheetConfig";
import {
  allTableNames,
  type TableName,
  type TableNameSimple,
} from "../0. spreadsheetMetaData/4.0 tableAttributes";

import {
  isInTnGroup,
  type GroupToTableName,
  type TnGroupName,
} from "../0. spreadsheetMetaData/4.1 tableNameGroups";
import { type ColumnName } from "../0. spreadsheetMetaData/5. allColumnAttributes";
import { ColumnSchema } from "./ColumnSchema";
import { SheetSchema } from "./SheetSchema";

export class SpreadsheetSchema {
  configGet<K extends keyof SpreadsheetConfig>(key: K): SpreadsheetConfig[K] {
    return configGet(key);
  }
  get columnIdRowIdxBase0(): number {
    return spreadsheetConfig.columnIdRowIdxBase1 - 1;
  }
  get topBodyRowIdxBase0(): number {
    return spreadsheetConfig.topBodyRowIdxBase1 - 1;
  }

  get allTableNames() {
    return allTableNames;
  }
  table<TN extends TableNameSimple>(tableName: TN): SheetSchema<TN> {
    return new SheetSchema(tableName);
  }
  sheetByGid(sheetGid: number): SheetSchema<TableName> {
    for (const tableName of this.allTableNames) {
      if ((sheetGid = this.table(tableName).sheetGid)) {
        return this.table(tableName);
      }
    }
    throw new Error(`Section not found for sheetGid ${sheetGid}`);
  }
  varb<TN extends TableName, CN extends ColumnName<TN>>(
    tableName: TN,
    columnName: CN,
  ): ColumnSchema<TN, CN> {
    return new ColumnSchema(tableName, columnName);
  }
  isInTnGroup<GN extends TnGroupName>(
    groupName: GN,
    tableName: string,
  ): tableName is GroupToTableName<GN> {
    return isInTnGroup(groupName, tableName);
  }
}
