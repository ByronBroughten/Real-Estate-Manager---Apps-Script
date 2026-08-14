import {
  schemaSheetNames,
  type SheetName,
  type SheetNameSimple,
} from "../01_configs/02_sheetTraitsTypes";

import { type ColumnName } from "../01_configs/03_columnTraits";
import { SchemaBase } from "../01_SchemaIndexed/SchemaBase";
import { SpreadsheetSchemaIndexed } from "../01_SchemaIndexed/SpreadsheetSchemaIndexed";
import {
  makeRowRange,
  type RowRange,
} from "../02_AppsScriptRaw/Types/RawState";
import type {
  RowSpecifierBySchemaName,
  SheetColumnNamesStandard,
} from "../03_SpreadsheetNamed/Types/NamedState";
import { ColumnSchemaNamed } from "./ColumnSchemaNamed";
import {
  isInTnGroup,
  type GroupToSheetName,
  type TnGroupName,
} from "./SheetNameGroups";
import { SheetSchemaNamed } from "./SheetSchemaNamed";

export class SpreadsheetSchema extends SchemaBase {
  get raw(): SpreadsheetSchemaIndexed {
    return new SpreadsheetSchemaIndexed();
  }
  sheet<TN extends SheetNameSimple>(sheetName: TN): SheetSchemaNamed<TN> {
    return new SheetSchemaNamed(sheetName);
  }
  sheetByGid(sheetGid: number): SheetSchemaNamed<SheetName> {
    const sheetName = this.raw.sheet(sheetGid).sheetName;
    return new SheetSchemaNamed(sheetName);
  }
  column<TN extends SheetName, CN extends ColumnName<TN>>(
    sheetName: TN,
    columnName: CN,
  ): ColumnSchemaNamed<TN, CN> {
    return new ColumnSchemaNamed(sheetName, columnName);
  }
  get sheetNames() {
    return schemaSheetNames;
  }
  get sheetNamesWithoutIdPrefix(): SheetName[] {
    return this.sheetNames.filter((sheetName) => {
      this.sheet(sheetName).trait("idPrefix") === "";
    });
  }
  specifyAllSheetsAndColumns(): SheetColumnNamesStandard<SheetName> {
    return this.sheetNames.reduce((acc, sheetName) => {
      acc[sheetName] = this.sheet(sheetName).columnNames;
      return acc;
    }, {} as SheetColumnNamesStandard<SheetName>);
  }
  rawRowSpecifierByName(rowName: RowSpecifierBySchemaName): RowRange {
    const mrs = makeRowRange;
    function mrs1(startRowIndex: number): RowRange {
      return mrs(startRowIndex, 1);
    }
    const rowNameToRawSpecifier: Record<RowSpecifierBySchemaName, RowRange> = {
      all: mrs(0),
      data: mrs(this.topDataRowIdx),
      topDatum: mrs1(this.topDataRowIdx),
      actions: mrs1(this.actionRowIdx),
      columnIds: mrs1(this.colIdRowIdx),
      headers: mrs1(this.headerRowIdx),
    };
    return rowNameToRawSpecifier[rowName];
  }
  isInTnGroup<GN extends TnGroupName>(
    groupName: GN,
    sheetName: string,
  ): sheetName is GroupToSheetName<GN> {
    return isInTnGroup(groupName, sheetName);
  }
}
