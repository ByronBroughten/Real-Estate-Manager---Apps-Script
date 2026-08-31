// TODO

import type { SheetNameSimple } from "../01_generatedConfigs/sheetConfigsTypes";
import { SpreadsheetNamed } from "../04_SpreadsheetNamed/SpreadsheetNamed";
import { EndpointHandlerBase } from "./EndpointHandlerBase";

export class EndpointHandler<
  SN extends SheetNameSimple,
> extends EndpointHandlerBase<SN> {
  get ss() {
    return new SpreadsheetNamed(this.spreadsheetNamedProps);
  }
  protected runEndpoint(endpoint: () => void): void {
    try {
      // Depending on average speed, maybe set time last ran and "...processing" at outset. Also set time last ran as ""
      // If runs are fast, though, then don't do any of that.
      endpoint();
      // success: set last successful run to true, clear any error message (if not done already)
    } catch (error) {
      // potentially write the error to the top body row of run and status
      // you could also write the error to each row that was being processed
      // selectedIndexes = selectedRowIndexes ? selectedRowIndexes : [0]
    } finally {
      // Set whether last ran was a success
      this.ss.batchUpdateGSheets();
    }
  }
}
