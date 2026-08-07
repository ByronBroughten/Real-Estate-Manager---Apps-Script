import {
  getTableAttributeByGid,
  type SheetName,
  type TableAttributesRaw,
} from "../0. spreadsheetMetaData/4.0 tableAttributes";
import {
  getSheetColumnIdxes,
  type ColumnName,
} from "../0. spreadsheetMetaData/5. allColumnAttributes";
import { ColumnSchemaRaw } from "./ColumnSchemaRaw";
import { SchemaBase } from "./SchemaBase";

const varbNameImmutable = ["baseId"] as const;
type VarbNameImmutable = (typeof varbNameImmutable)[number];
export type VarbNameMutable<TN extends SheetName> = Exclude<
  ColumnName<TN>,
  VarbNameImmutable
>;

export class SheetSchemaRaw extends SchemaBase {
  readonly sheetGid: number;
  constructor(sheetGid: number) {
    super();
    this.sheetGid = sheetGid;
  }
  private attribute<K extends keyof TableAttributesRaw>(
    key: K,
  ): TableAttributesRaw[K] {
    return getTableAttributeByGid(this.sheetGid, key);
  }
  column(columnIdx: number): ColumnSchemaRaw {
    return new ColumnSchemaRaw(this.sheetGid, columnIdx);
  }
  get allColumnIdxes(): MapIterator<number> {
    return getSheetColumnIdxes(this.sheetGid);
  }
  get sheetName(): SheetName {
    return this.attribute("sheetName");
  }
}
