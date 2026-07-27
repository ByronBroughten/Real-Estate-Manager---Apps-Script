import type { TableName } from "../../appSchema/0. sheetMetaData/4.0 tableAttributes";
import type { SpreadsheetSchema } from "../../appSchema/SpreadsheetSchema";
import type { SheetNamed } from "../GenericHandlers/SheetNamed";
import { Spreadsheet } from "../GenericHandlers/SpreadsheetNamed";

export class OperatorBase {
  readonly ss: Spreadsheet;
  constructor(ss: Spreadsheet) {
    this.ss = ss;
  }
  get schema(): SpreadsheetSchema {
    return this.ss.schema;
  }
  sheet<TN extends TableName>(tableName: TN): SheetNamed<TN> {
    return this.ss.sheet(tableName);
  }
  gatherRequestsAndBatchUpdate(): void {
    return this.ss.gatherRequestsAndBatchUpdate();
  }
}
