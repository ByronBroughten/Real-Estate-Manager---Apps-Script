import { SheetIndexedBase } from "./SheetIndexedBase";
import { SheetSchemaIndexed } from "./SheetSchemaIndexed";

export abstract class SheetCommon extends SheetIndexedBase {
  get schema(): SheetSchemaIndexed {
    return new SheetSchemaIndexed(this.sheetGid);
  }
}
