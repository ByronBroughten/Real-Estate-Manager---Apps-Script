import {
  getTableAttributeByGid,
  type SheetName,
  type TableAttributesRaw,
} from "../1.0 Configs/2.0 sheetConfigs";
import {
  getSheetColumnIdxes,
  type ColumnName,
} from "../1.0 Configs/3.0 columnConfigs";
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
  column(colIndex: number): ColumnSchemaRaw {
    return new ColumnSchemaRaw(this.sheetGid, colIndex);
  }
  get allColumnIdxes(): MapIterator<number> {
    return getSheetColumnIdxes(this.sheetGid);
  }
  get sheetName(): SheetName {
    return this.attribute("sheetName");
  }
  makeColumnId(): string {
    return this.makeId("c", this._makeSheetDimensionId());
  }
  makeRowId(): string {
    return this.makeId("r", this._makeSheetDimensionId());
  }
  private _makeSheetDimensionId(): string {
    const idPrefix = this.attribute("idPrefix");
    if (!idPrefix) {
      throw new Error(
        `Attempted to make id for sheet ${this.sheetName} without an idPrefix`,
      );
    }
    return this.makeUniqueId(idPrefix);
  }
}
