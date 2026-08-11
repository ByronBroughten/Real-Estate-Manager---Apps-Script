import type { SheetName } from "../../1.0 Configs/2.0 sheetConfigs";
import type { SpreadsheetSchema } from "../../2.0 Schemas/SpreadsheetSchemaNamed";
import type { SheetNamed } from "../SheetNamed";
import type { SpreadsheetNamed } from "../SpreadsheetNamed";

export class OperatorBase {
  readonly ss: SpreadsheetNamed;
  constructor(ss: SpreadsheetNamed) {
    this.ss = ss;
  }
  get schema(): SpreadsheetSchema {
    return this.ss.schema;
  }
  sheet<TN extends SheetName>(sheetName: TN): SheetNamed<TN> {
    return this.ss.sheet(sheetName);
  }
  gatherRequestsAndBatchUpdate(): void {
    return this.ss.raw.batchUpdateGSheets();
  }
}
