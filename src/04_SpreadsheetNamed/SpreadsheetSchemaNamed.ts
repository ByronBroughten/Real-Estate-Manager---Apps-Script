import {
  configSheetNames,
  type SheetName,
  type SheetNameSimple,
} from "../01_generatedConfigs/sheetConfigsTypes";

import { type ColumnName } from "../01_generatedConfigs/columnConfigsTypes";
import { SchemaBase } from "../02_SpreadsheetRaw/BaseSchema";
import { ColumnSchemaNamed } from "./ColumnSchemaNamed";
import { SheetSchemaNamed } from "./SheetSchemaNamed";
import type { SheetColumnNamesStandard } from "./Types/NamedState";

export class SpreadsheetSchemaNamed extends SchemaBase {
  sheet<TN extends SheetNameSimple>(sheetName: TN): SheetSchemaNamed<TN> {
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
  specifyAllSheetsAndColumns(): SheetColumnNamesStandard<SheetName> {
    return this.sheetNames.reduce((acc, sheetName) => {
      acc[sheetName] = this.sheet(sheetName).columnNames;
      return acc;
    }, {} as SheetColumnNamesStandard<SheetName>);
  }
}
