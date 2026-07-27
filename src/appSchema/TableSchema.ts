import { utils } from "../utilitiesGeneral";
import { Arr } from "../utils/Arr";
import { spreadsheetConfig } from "./0. sheetMetaData/1. spreadsheetConfig";
import {
  getTableAttribute,
  type TableAttributes,
  type TableName,
  type TableNameSimple,
} from "./0. sheetMetaData/4.0 tableAttributes";
import {
  getTableColumnNames,
  type ColumnName,
  type TableValues,
} from "./0. sheetMetaData/5. columnAttributes";
import { ColumnSchema } from "./ColumnSchema";
import { SpreadsheetSchema } from "./SpreadsheetSchema";

const varbNameImmutable = ["baseId"] as const;
type VarbNameImmutable = (typeof varbNameImmutable)[number];
export type VarbNameMutable<TN extends TableName> = Exclude<
  ColumnName<TN>,
  VarbNameImmutable
>;

export class TableSchema<TN extends TableNameSimple> {
  readonly tableName: TN;
  constructor(tableName: TN) {
    this.tableName = tableName;
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
  get topBodyRowIdxBase1(): number {
    return spreadsheetConfig.topBodyRowIdxBase1;
  }
  column<CN extends ColumnName<TN>>(columnName: CN): ColumnSchema<TN, CN> {
    return new ColumnSchema(this.tableName, columnName);
  }
  makeSectionIds(): {
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
    return getTableColumnNames(this.tableName);
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
          ).makeDefaultValue() as TableValues<TN, CN>[typeof columnName];
        }
        return values;
      },
      {} as TableValues<TN, CN>,
    );
  }
}
