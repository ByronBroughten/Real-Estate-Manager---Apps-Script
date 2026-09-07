import type { GoogleColor } from "../00_base/AppsScriptTypes";
import type { RunnerStem } from "../01_generatedConfigs/columnConfigsTypes";
import type { CellNamed } from "../04_SpreadsheetNamed/CellNamed";
import type { SheetNamed } from "../04_SpreadsheetNamed/SheetNamed";
import type { SheetNameWithRunnerColumns } from "../04_SpreadsheetNamed/SheetNameGroups";
import { SpreadsheetNamed } from "../04_SpreadsheetNamed/SpreadsheetNamed";
import { Tim } from "../utils/Tim";
import {
  RunnerEndpointHandlerBase,
  type RunStatusName,
  type TimeLastRanName,
} from "./RunnerEndpointHandlerBase";

interface RunState {
  message: string;
  backgroundColor: GoogleColor;
}

// Paired here so no path can show one state's colour beside another's message.
const runStates = {
  running: {
    message: "Running…",
    backgroundColor: { red: 1, green: 0.949, blue: 0.8 },
  },
  succeeded: {
    message: "Succeeded",
    backgroundColor: { red: 0.851, green: 0.918, blue: 0.827 },
  },
  failed: {
    message: "Failed",
    backgroundColor: { red: 0.957, green: 0.8, blue: 0.8 },
  },
} as const satisfies Record<string, RunState>;

type RunStateName = keyof typeof runStates;
export type Endpoint = (selectedRowIndexes?: number) => string | undefined;

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
  get runStatusCell(): CellNamed<SN, RunStatusName<SN, ST>> {
    return this.sheet.column(this.runStatusName).data.topCell();
  }
  protected runEndpoint(endpoint: Endpoint): void {
    try {
      this.onRunSetup();
      endpoint();
      this.onRunSuccess();
    } catch (error) {
      // you could also write the error to each row that was being processed
      // selectedIndexes = selectedRowIndexes ? selectedRowIndexes : [0]
      this.onRunError(error);
    } finally {
      this.onRunEnd();
    }
  }
  // The flush is what puts the running state on the sheet before the work runs.
  onRunSetup(): void {
    this.sheet.uniformRow("columnId").prepFetchFull();
    this.ss.fetchAllPrepped();
    this.sheet.column(this.timeLastRanName).actionRowToDefault();
    this.timeLastRanCell.updateValue(Tim.nowTimestamp());
    this._applyRunState("running");
    this.ss.batchUpdateGSheets();
  }
  onRunSuccess(): void {
    this._applyRunState("succeeded");
  }
  // Queued changes are shared by reference, so a half-finished run must be dropped before status is written.
  onRunError(error: unknown): void {
    this.ss.discardQueuedChanges();
    this._applyRunState("failed", String(error));
  }
  onRunEnd(): void {
    this.ss.batchUpdateGSheets();
    Logger.log("Run ended.");
  }
  // The timestamp is written once at setup; a state change only recolours it.
  private _applyRunState(stateName: RunStateName, message?: string): void {
    const state = runStates[stateName];
    this.runStatusCell.updateValue(message ?? state.message);
    this.timeLastRanCell.updateBackgroundColor(state.backgroundColor);
  }
}
