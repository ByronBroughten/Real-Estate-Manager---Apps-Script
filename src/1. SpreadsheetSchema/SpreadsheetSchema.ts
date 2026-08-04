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
  sheet<TN extends TableNameSimple>(sheetName: TN): SheetSchemaNamed<TN> {
    return new SheetSchemaNamed(sheetName);
  }
  column<TN extends TableName, CN extends ColumnName<TN>>(
    sheetName: TN,
    columnName: CN,
  ): ColumnSchemaNamed<TN, CN> {
    return new ColumnSchemaNamed(sheetName, columnName);
  }
  get allTableNames() {
    return allTableNames;
  }
  isInTnGroup<GN extends TnGroupName>(
    groupName: GN,
    sheetName: string,
  ): sheetName is GroupToTableName<GN> {
    return isInTnGroup(groupName, sheetName);
  }
}
