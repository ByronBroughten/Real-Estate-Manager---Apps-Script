import type { SheetName } from "../02_generatedTraits/02_sheetTraitsTypes";
import { getSheetColumnIds } from "../02_generatedTraits/03_columnTraits";
import { SchemaBase } from "./SchemaBase";

interface SheetTraitCommon {
  idPrefix: string;
  hasIdColumn: boolean;
}

export abstract class SheetSchemaCommon extends SchemaBase {
  abstract sheetGid: number;
  abstract sheetName: SheetName;
  abstract trait<K extends keyof SheetTraitCommon>(key: K): SheetTraitCommon[K];
  makeRowId(): string {
    return this.makeRowIdFromPrefix(this.trait("idPrefix"));
  }
  get idPrefix(): string {
    return this.trait("idPrefix");
  }
  get columnIds(): MapIterator<string> {
    return getSheetColumnIds(this.sheetGid);
  }
}
