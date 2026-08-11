import {
  getTableAttribute,
  type SheetName,
  type SheetNameSimple,
  type TableAttributes,
} from "../1.0 Configs/2.0 sheetConfigs";
import {
  getSheetColumnNames,
  type ColumnName,
} from "../1.0 Configs/3.0 columnConfigs";
import { SchemaBase } from "../1.1 SpreadsheetSchemaRaw/SchemaBase";
import { SheetSchemaRaw } from "../1.1 SpreadsheetSchemaRaw/SheetSchemaRaw";
import type { ColumnSpecifierNamed } from "../3. SpreadsheetNamed/Types/NamedState";
import { ColumnSchemaNamed } from "./ColumnSchemaNamed";
import { SpreadsheetSchema } from "./SpreadsheetSchemaNamed";

const varbNameImmutable = ["baseId"] as const;
type VarbNameImmutable = (typeof varbNameImmutable)[number];
export type VarbNameMutable<TN extends SheetName> = Exclude<
  ColumnName<TN>,
  VarbNameImmutable
>;

export class SheetSchemaNamed<TN extends SheetNameSimple> extends SchemaBase {
  readonly sheetName: TN;
  constructor(sheetName: TN) {
    super();
    this.sheetName = sheetName;
  }
  get raw(): SheetSchemaRaw {
    return new SheetSchemaRaw(this.attribute("sheetGid"));
  }
  columnNameByIdx(colIdx: number): ColumnName<TN> {
    return this.raw.column(colIdx).attribute("columnName") as ColumnName<TN>;
  }
  attribute<K extends keyof TableAttributes<TN>>(
    key: K,
  ): TableAttributes<TN>[K] {
    return getTableAttribute(this.sheetName, key);
  }
  get sheetGid(): number {
    return this.attribute("sheetGid");
  }
  get spreadsheet(): SpreadsheetSchema {
    return new SpreadsheetSchema();
  }
  column<CN extends ColumnName<TN>>(columnName: CN): ColumnSchemaNamed<TN, CN> {
    return new ColumnSchemaNamed(this.sheetName, columnName);
  }
  colIndex<CN extends ColumnName<TN>>(columnName: CN): number {
    return this.column(columnName).colIndex;
  }
  columnSpecifierToStandard(
    columnSpecifier: ColumnSpecifierNamed<TN>,
  ): ColumnName<TN>[] {
    if (columnSpecifier === "allColumns") {
      return this.columnNames;
    } else if (Array.isArray(columnSpecifier)) {
      return columnSpecifier;
    } else {
      return [columnSpecifier];
    }
  }

  get columnNames(): ColumnName<TN>[] {
    return getSheetColumnNames(this.sheetName);
  }
}
