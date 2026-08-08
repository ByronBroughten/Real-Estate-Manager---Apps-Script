import {
  getTableAttribute,
  type SheetName,
  type TableAttributes,
  type TableNameSimple,
} from "../0. spreadsheetMetaData/4.0 tableAttributes";
import {
  getSheetColumnNames,
  type ColumnName,
  type TableValues,
} from "../0. spreadsheetMetaData/5. allColumnAttributes";
import { SchemaBase } from "../1.1 SpreadsheetSchemaRaw/SchemaBase";
import { SheetSchemaRaw } from "../1.1 SpreadsheetSchemaRaw/SheetSchemaRaw";
import type { ColumnSpecifierNamed } from "../3. SpreadsheetNamed/Types/NamedState";
import { Arr } from "../utils/Arr";
import { ColumnSchemaNamed } from "./ColumnSchemaNamed";
import { SpreadsheetSchema } from "./SpreadsheetSchemaNamed";

const varbNameImmutable = ["baseId"] as const;
type VarbNameImmutable = (typeof varbNameImmutable)[number];
export type VarbNameMutable<TN extends SheetName> = Exclude<
  ColumnName<TN>,
  VarbNameImmutable
>;

export class SheetSchemaNamed<TN extends TableNameSimple> extends SchemaBase {
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
  columnIndex<CN extends ColumnName<TN>>(columnName: CN): number {
    return this.column(columnName).columnIdx;
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
  makeDefaultValues<CN extends VarbNameMutable<TN>>(
    columnNames: CN[] = Arr.exclude(
      this.columnNames,
      varbNameImmutable,
    ) as CN[],
  ): TableValues<TN, CN> {
    return columnNames.reduce(
      (values, columnName) => {
        if (varbNameImmutable.includes(columnName as VarbNameImmutable)) {
          return values;
        } else {
          values[columnName] = this.column(
            columnName,
          ).makeDefaultDataValue() as any;
        }
        return values;
      },
      {} as TableValues<TN, CN>,
    );
  }
}
