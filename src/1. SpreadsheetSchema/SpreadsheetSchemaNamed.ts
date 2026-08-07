import {
  allTableNames,
  type SheetName,
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
import {
  makeRowSpecifierRaw,
  type RowSpecifierRaw,
} from "../2. AppsScriptRaw/Types/RawState";
import type { RowSpecifierBySchemaName } from "../3. SpreadsheetNamed/Types/NamedState";
import { ColumnSchemaNamed } from "./ColumnSchemaNamed";
import { SheetSchemaNamed } from "./SheetSchemaNamed";

export class SpreadsheetSchema extends SchemaBase {
  get raw(): SpreadsheetSchemaRaw {
    return new SpreadsheetSchemaRaw();
  }
  sheet<TN extends TableNameSimple>(sheetName: TN): SheetSchemaNamed<TN> {
    return new SheetSchemaNamed(sheetName);
  }
  column<TN extends SheetName, CN extends ColumnName<TN>>(
    sheetName: TN,
    columnName: CN,
  ): ColumnSchemaNamed<TN, CN> {
    return new ColumnSchemaNamed(sheetName, columnName);
  }
  get allTableNames() {
    return allTableNames;
  }
  rawRowSpecifierByName(rowName: RowSpecifierBySchemaName): RowSpecifierRaw {
    const mrs = makeRowSpecifierRaw;
    const rowNameToRawSpecifier: Record<
      RowSpecifierBySchemaName,
      RowSpecifierRaw
    > = {
      all: mrs(0, "allFromStart"),
      data: mrs(this.topDataRowIdx, "allFromStart"),
      topDatum: mrs(this.topDataRowIdx, 1),
      actions: mrs(this.actionRowIdx, 1),
      columnIds: mrs(this.colIdRowIdx, 1),
    };
    return rowNameToRawSpecifier[rowName];
  }
  isInTnGroup<GN extends TnGroupName>(
    groupName: GN,
    sheetName: string,
  ): sheetName is GroupToTableName<GN> {
    return isInTnGroup(groupName, sheetName);
  }
}
