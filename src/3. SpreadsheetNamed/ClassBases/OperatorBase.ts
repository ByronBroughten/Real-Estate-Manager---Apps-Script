import type { TableName } from "../../0. spreadsheetMetaData/4.0 tableAttributes";
import type { SpreadsheetSchema } from "../../1. SpreadsheetSchema/SpreadsheetSchema";
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
  sheet<TN extends TableName>(sheetName: TN): SheetNamed<TN> {
    return this.ss.sheet(sheetName);
  }
  gatherRequestsAndBatchUpdate(): void {
    return this.ss.gatherRequestsAndBatchUpdate();
  }
}
