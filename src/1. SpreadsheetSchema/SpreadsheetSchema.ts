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
import { SchemaBase } from "../1.1 SpreadsheetSchemaRaw/SchemaBase";
import { SpreadsheetSchemaRaw } from "../1.1 SpreadsheetSchemaRaw/SpreadsheetSchemaRaw";
import { ColumnSchema } from "./ColumnSchema";
import { SheetSchema } from "./SheetSchema";

export class SpreadsheetSchema extends SchemaBase {
  get raw(): SpreadsheetSchemaRaw {
    return new SpreadsheetSchemaRaw();
  }
  sheet<TN extends TableNameSimple>(tableName: TN): SheetSchema<TN> {
    return new SheetSchema(tableName);
  }
  column<TN extends TableName, CN extends ColumnName<TN>>(
    tableName: TN,
    columnName: CN,
  ): ColumnSchema<TN, CN> {
    return new ColumnSchema(tableName, columnName);
  }
  validateConfig() {
    if (this.colIdIdxAsFetched < 0) {
      throw new Error(
        "Column index is not fetched; column cannot be verified.",
      );
    }
    if (this.topBodyRowIdxAsFetched < 0) {
      throw new Error(
        "Top row of table data is not fetched; data will be incomplete.",
      );
    }
  }
  get allTableNames() {
    return allTableNames;
  }
  isInTnGroup<GN extends TnGroupName>(
    groupName: GN,
    tableName: string,
  ): tableName is GroupToTableName<GN> {
    return isInTnGroup(groupName, tableName);
  }
}
