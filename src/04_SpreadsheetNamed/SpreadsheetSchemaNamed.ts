import {
  configSheetNames,
  type SheetName,
  type SheetNameSimple,
} from "../01_generatedConfigs/sheetConfigsTypes";

import { type ColumnName } from "../01_generatedConfigs/columnConfigsTypes";
import { SchemaBase } from "../02_SpreadsheetRaw/BaseSchema";
import {
  makeRowRange,
  type RowRange,
} from "../02_SpreadsheetRaw/ClassTypes/RawState";
import { SpreadsheetSchemaIndexed } from "../03_SpreadsheetIndexed/SpreadsheetSchemaIndexed";
import { ColumnSchemaNamed } from "./ColumnSchemaNamed";
import {
  isInTnGroup,
  type SheetNameByGroup,
  type TnGroupName,
} from "./SheetNameGroups";
import { SheetSchemaNamed } from "./SheetSchemaNamed";
import type {
  RowSpecifierBySchemaName,
  SheetColumnNamesStandard,
} from "./Types/NamedState";

export class SpreadsheetSchemaNamed extends SchemaBase {
  get indexed(): SpreadsheetSchemaIndexed {
    return new SpreadsheetSchemaIndexed();
  }
  sheet<TN extends SheetNameSimple>(sheetName: TN): SheetSchemaNamed<TN> {
    return new SheetSchemaNamed(sheetName);
  }
  sheetByGid(sheetGid: number): SheetSchemaNamed<SheetName> {
    const { sheetName } = this.indexed.sheet(sheetGid);
    return new SheetSchemaNamed(sheetName);
  }
  column<TN extends SheetName, CN extends ColumnName<TN>>(
    sheetName: TN,
    columnName: CN,
  ): ColumnSchemaNamed<TN, CN> {
    return new ColumnSchemaNamed(sheetName, columnName);
  }
  get sheetNames() {
    return configSheetNames;
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
      actions: mrs1(this.actionRowIndex),
      columnIds: mrs1(this.colIdRowIndex),
      headers: mrs1(this.headerRowIndex),
    };
    return rowNameToRawSpecifier[rowName];
  }
  isInTnGroup<GN extends TnGroupName>(
    groupName: GN,
    sheetName: string,
  ): sheetName is SheetNameByGroup<GN> {
    return isInTnGroup(groupName, sheetName);
  }
}
