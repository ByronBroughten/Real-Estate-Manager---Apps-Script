import { getSheetColumnIds } from "../01_generatedConfigs/columnConfigsTypes";
import {
  configSheetGids,
  type SheetName,
} from "../01_generatedConfigs/sheetConfigsTypes";
import { SchemaBase } from "../02_SpreadsheetRaw/BaseSchema";

interface SheetTraitCommon {
  idPrefix: string;
  hasIdColumn: boolean;
}

export abstract class SheetSchemaCommon extends SchemaBase {
  abstract sheetGid: number;
  abstract sheetName: SheetName;
  abstract trait<K extends keyof SheetTraitCommon>(key: K): SheetTraitCommon[K];
  constructor() {
    super();
  }
  validateSheetGid(): void {
    if (!this.isInSheetGids(this.sheetGid)) {
      throw new Error(
        `Invalid sheetGid: ${this.sheetGid}. Must be one of: ${configSheetGids.join(
          ", ",
        )}`,
      );
    }
  }
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
