import {
  getTableAttribute,
  type TableAttributes,
  type TableName,
  type TableNameSimple,
} from "../0. spreadsheetMetaData/4.0 tableAttributes";
import {
  getSheetColumnNames,
  type ColumnName,
  type TableValues,
} from "../0. spreadsheetMetaData/5. allColumnAttributes";
import { SchemaBase } from "../1.1 SpreadsheetSchemaRaw/SchemaBase";
import { SheetSchemaRaw } from "../1.1 SpreadsheetSchemaRaw/SheetSchemaRaw";
import { utils } from "../utilitiesGeneral";
import { Arr } from "../utils/Arr";
import { ColumnSchemaNamed } from "./ColumnSchemaNamed";
import { SpreadsheetSchema } from "./SpreadsheetSchema";

const varbNameImmutable = ["baseId"] as const;
type VarbNameImmutable = (typeof varbNameImmutable)[number];
export type VarbNameMutable<TN extends TableName> = Exclude<
  ColumnName<TN>,
  VarbNameImmutable
>;

export class SheetSchemaNamed<TN extends TableNameSimple> extends SchemaBase {
  readonly tableName: TN;
  constructor(tableName: TN) {
    super();
    this.tableName = tableName;
  }
  get raw(): SheetSchemaRaw {
    return new SheetSchemaRaw(this.attribute("sheetGid"));
  }
  columnNameByIdx(colIdx: number): ColumnName<TN> {
    return this.raw.column(colIdx).attribute("columnName") as ColumnName<TN>;
  }
  private attribute<K extends keyof TableAttributes<TN>>(
    key: K,
  ): TableAttributes<TN>[K] {
    return getTableAttribute(this.tableName, key);
  }
  get sheetGid(): number {
    return this.attribute("sheetGid");
  }
  get spreadsheet(): SpreadsheetSchema {
    return new SpreadsheetSchema();
  }
  column<CN extends ColumnName<TN>>(columnName: CN): ColumnSchemaNamed<TN, CN> {
    return new ColumnSchemaNamed(this.tableName, columnName);
  }
  makeRowId(): {
    fullId: string;
    baseId: string;
  } {
    const idPrefix = this.attribute("idPrefix");
    if (!idPrefix) {
      throw new Error(
        `Attempted to make id for table ${this.tableName} without an idPrefix`,
      );
    }
    const baseId = utils.id.makeBase();
    return {
      baseId,
      fullId: `${idPrefix}-${baseId}`,
    };
  }
  get columnNames(): ColumnName<TN>[] {
    return getSheetColumnNames(this.tableName);
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
          ).makeDefaultValue() as any;
        }
        return values;
      },
      {} as TableValues<TN, CN>,
    );
  }
}
