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
import { ColumnSchemaNamed } from "./ColumnSchemaNamed";
import { SheetSchemaNamed } from "./SheetSchemaNamed";

export class SpreadsheetSchema extends SchemaBase {
  get raw(): SpreadsheetSchemaRaw {
    return new SpreadsheetSchemaRaw();
  }
  sheet<TN extends TableNameSimple>(tableName: TN): SheetSchemaNamed<TN> {
    return new SheetSchemaNamed(tableName);
  }
  column<TN extends TableName, CN extends ColumnName<TN>>(
    tableName: TN,
    columnName: CN,
  ): ColumnSchemaNamed<TN, CN> {
    return new ColumnSchemaNamed(tableName, columnName);
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
