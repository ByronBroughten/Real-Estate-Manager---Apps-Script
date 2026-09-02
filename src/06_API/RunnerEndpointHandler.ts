import type { RunnerStem } from "../01_generatedConfigs/columnConfigsTypes";
import type { CellNamed } from "../04_SpreadsheetNamed/CellNamed";
import type { SheetNamed } from "../04_SpreadsheetNamed/SheetNamed";
import type { SheetNameWithRunnerColumns } from "../04_SpreadsheetNamed/SheetNameGroups";
import { SpreadsheetNamed } from "../04_SpreadsheetNamed/SpreadsheetNamed";
import { Tim } from "../utils/Tim";
import {
  RunnerEndpointHandlerBase,
  type ErrorMessageName,
  type LastRanSucceededName,
  type TimeLastRanName,
} from "./RunnerEndpointHandlerBase";

export class RunnerEndpointHandler<
  SN extends SheetNameWithRunnerColumns,
  ST extends RunnerStem<SN>,
> extends RunnerEndpointHandlerBase<SN, ST> {
  get ss(): SpreadsheetNamed {
    return new SpreadsheetNamed(this.spreadsheetNamedProps);
  }
  get sheet(): SheetNamed<SN> {
    return this.ss.sheet(this.sheetName);
  }
  get timeLastRanCell(): CellNamed<SN, TimeLastRanName<SN, ST>> {
    return this.sheet.column(this.timeLastRanName).data.topCell();
  }
  get lastRanSucceededCell(): CellNamed<SN, LastRanSucceededName<SN, ST>> {
    return this.sheet.column(this.lastRanSucceededName).data.topCell();
  }
  get errorMessageCell(): CellNamed<SN, ErrorMessageName<SN, ST>> {
    return this.sheet.column(this.errorMessageName).data.topCell();
  }
  protected runEndpoint(endpoint: () => void): void {
    try {
      // Depending on average speed, maybe set time last ran and "...processing" at outset. Also set time last ran as ""
      // If runs are fast, though, then don't do any of that.
      this.onRunSetup();
      endpoint();
      // success: set last successful run to true, clear any error message (if not done already)
      this.onRunSuccess();
    } catch (error) {
      // potentially write the error to the top body row of run and status
      // you could also write the error to each row that was being processed
      // selectedIndexes = selectedRowIndexes ? selectedRowIndexes : [0]
      this.onRunError(error);
    } finally {
      // Set whether last ran was a success
      this.onRunEnd();
    }
  }
  onRunSetup(): void {
    Logger.log("Setting up.");
    this.sheet.uniformRow("columnId").prepFetchFull();
    this.ss.fetchAllPrepped();
    this.sheet.column(this.timeLastRanName).actionRowToDefault();
    this.timeLastRanCell.updateValue("Processing...");
    this.errorMessageCell.updateValue("");
    this.ss.batchUpdateGSheets();
  }
  onRunSuccess(): void {
    Logger.log("Succeeding.");
    this.lastRanSucceededCell.updateValue(true);
    this.errorMessageCell.updateValue("");
  }
  // Queued changes are shared by reference, so a half-finished run must be dropped before status is written.
  onRunError(error: unknown): void {
    Logger.log("Error occurred.");
    this.ss.discardQueuedChanges();
    this.lastRanSucceededCell.updateValue(false);
    this.errorMessageCell.updateValue(String(error));
  }
  onRunEnd(): void {
    Logger.log("Closing out run.");
    this.timeLastRanCell.updateValue(Tim.nowTimestamp());
    this.ss.batchUpdateGSheets();
    Logger.log("Run ended.");
  }
}
