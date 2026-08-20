import type { CellValue } from "../00_base/base";
import {
  getSheetTraitByGid,
  type SheetName,
  type SheetTraitRaw,
  type SheetTraitRawKey,
} from "../02_generatedTraits/02_sheetTraitsTypes";
import { type ColumnName } from "../02_generatedTraits/03_columnTraits";
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
    return new ColumnSchemaIndexed({
      sheetGid: this.sheetGid,
      colIndex,
    });
  }
  get sheetName(): SheetName {
    return this.trait("sheetName");
  }
  allDefaultVValues(): Map<number, CellValue> {
    return this.defaultValues([...this.colIndexes]);
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
