import type { SheetName } from "../02_generatedTraits/02_sheetTraitsTypes";
import { SchemaBase } from "./SchemaBase";

interface SheetTraitCommon {
  idPrefix: string;
  hasIdColumn: boolean;
}

export abstract class SheetSchemaCommon extends SchemaBase {
  abstract sheetGid: number;
  abstract sheetName: SheetName;
  abstract trait<K extends keyof SheetTraitCommon>(
    key: K,
  ): SheetTraitCommon[K];

  makeRowId(): string {
    return this.makeRowIdFromPrefix(this.trait("idPrefix"));
  }
}
