import {
  tableNames,
  type TableName,
} from "./0. sheetMetaData/4.0 tableAttributes";

import {
  isInTnGroup,
  type GroupToTableName,
  type TnGroupName,
} from "./0. sheetMetaData/4.1 tableNameGroups";
import { type ColumnName } from "./0. sheetMetaData/5. columnAttributes";
import { ColumnSchema } from "./ColumnSchema";
import { TableSchema } from "./TableSchema";

export class SpreadsheetSchema {
  constructor() {}
  get tableNames() {
    return tableNames;
  }
  table<TN extends TableName>(tableName: TN): TableSchema<TN> {
    return new TableSchema(tableName);
  }
  sectionBysheetGid(sheetGid: number): TableSchema<TableName> {
    for (const tableName of this.tableNames) {
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
