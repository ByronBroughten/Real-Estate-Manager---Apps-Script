import type { CellValue } from "../00_base/base";
import {
  getSheetTraitByGid,
  type SheetName,
  type SheetTraitRaw,
  type SheetTraitRawKey,
} from "../02_generatedTraits/02_sheetTraitsTypes";
import {
  getSheetColumnIdxes,
  type ColumnName,
} from "../02_generatedTraits/03_columnTraits";
import { ColumnSchemaIndexed } from "./ColumnSchemaIndexed";
import { SheetSchemaCommon } from "./SheetSchemaCommon";

const varbNameImmutable = ["baseId"] as const;
type VarbNameImmutable = (typeof varbNameImmutable)[number];
export type VarbNameMutable<TN extends SheetName> = Exclude<
  ColumnName<TN>,
  VarbNameImmutable
>;

export class SheetSchemaIndexed extends SheetSchemaCommon {
  readonly sheetGid: number;
  constructor(sheetGid: number) {
    super();
    this.sheetGid = sheetGid;
  }
  trait<K extends SheetTraitRawKey>(key: K): SheetTraitRaw<K> {
    return getSheetTraitByGid(this.sheetGid, key);
  }
  column(colIndex: number): ColumnSchemaIndexed {
    return new ColumnSchemaIndexed(this.sheetGid, colIndex);
  }

  get schemaColumnIdxes(): MapIterator<number> {
    return getSheetColumnIdxes(this.sheetGid);
  }
  get sheetName(): SheetName {
    return this.trait("sheetName");
  }
  defaultValues(colIndexes: number[]): Map<number, CellValue> {
    return colIndexes.reduce(
      (acc, colIndex) => {
        acc.set(colIndex, this.column(colIndex).makeDefaultDataValue());
        return acc;
      },
      new Map() as Map<number, CellValue>,
    );
  }
  makeColumnId(): string {
    return this.makeColIdFromPrefix(this.trait("idPrefix"));
  }
}
