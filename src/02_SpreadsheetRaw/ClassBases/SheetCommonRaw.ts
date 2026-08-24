import { SchemaBase } from "../SchemaBase";
import { SheetRawBase } from "./SheetRawBase";

export abstract class SheetCommonRaw extends SheetRawBase {
  get schema(): SchemaBase {
    return new SchemaBase();
  }
}
