import type { CellValue } from "../00_traitPrecursors/base";
import {
  getSheetTraitByGid,
  type SheetName,
  type SheetTraitRaw,
  type SheetTraitRawKey,
} from "../01_generatedTraits/02_sheetTraitsTypes";
import {
  getSheetColumnIdxes,
  type ColumnName,
} from "../01_generatedTraits/03_columnTraits";
import { ColumnSchemaIndexed } from "./ColumnSchemaIndexed";
import { SchemaBase } from "./SchemaBase";

const varbNameImmutable = ["baseId"] as const;
type VarbNameImmutable = (typeof varbNameImmutable)[number];
export type VarbNameMutable<TN extends SheetName> = Exclude<
  ColumnName<TN>,
  VarbNameImmutable
>;

export class SheetSchemaIndexed extends SchemaBase {
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
      (acc, colIdx) => {
        acc.set(colIdx, this.column(colIdx).makeDefaultDataValue());
        return acc;
      },
      new Map() as Map<number, CellValue>,
    );
  }
  makeRowId(): string {
    return this.makeRowIdFromPrefix(this.trait("idPrefix"));
  }
  makeColumnId(): string {
    return this.makeColIdFromPrefix(this.trait("idPrefix"));
  }
}
