import type { GoogleColor } from "../00_base/AppsScriptTypes";
import type { ColumnName } from "../01_generatedConfigs/columnConfigsTypes";
import type { SheetNameSimple } from "../01_generatedConfigs/sheetConfigsTypes";
import type { CellChange } from "../03_SpreadsheetIndexed/ClassTypes/IndexedState";
import {
  SheetNamedBase,
  type SheetNamedProps,
} from "../04_SpreadsheetNamed/ClassBases/SheetNamedBase";
import type { SheetNamed } from "../04_SpreadsheetNamed/SheetNamed";
import { SpreadsheetNamed } from "../04_SpreadsheetNamed/SpreadsheetNamed";
import {
  CheckboxColumnOperator,
  type CheckboxColumnName,
} from "../05_Operators/CheckboxColumnOperator";
import { Tim } from "../utils/Tim";
import type { EndpointDispatched, FeedbackColumnName } from "./Endpoints";

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

interface RunStateProps {
  startTime?: string;
  message?: string | void;
}

export interface EndpointRunProps<
  SN extends SheetNameSimple,
> extends SheetNamedProps<SN> {
  entryColumnName: ColumnName<SN>;
  endpoint: EndpointDispatched<SN>;
}

export class EndpointRun<
  SN extends SheetNameSimple = SheetNameSimple,
> extends SheetNamedBase<SN> {
  readonly entryColumnName: ColumnName<SN>;
  readonly endpoint: EndpointDispatched<SN>;
  constructor({ entryColumnName, endpoint, ...props }: EndpointRunProps<SN>) {
    super(props);
    this.entryColumnName = entryColumnName;
    this.endpoint = endpoint;
  }
  get ss(): SpreadsheetNamed {
    return new SpreadsheetNamed(this.spreadsheetNamedProps);
  }
  get sheet(): SheetNamed<SN> {
    return this.ss.sheet(this.sheetName);
  }
  run(isChecked: boolean): void {
    this._prepSelectorFetch();
    this.ss.fetchAllPrepped();
    const selectedRowIndexes = this._selectedRowIndexes();
    this._resetEntryCheckbox();
    if (this.endpoint.selector && selectedRowIndexes.length === 0) {
      this.ss.batchUpdateGSheets();
      Logger.log("No rows are selected, so the endpoint did not run.");
      return;
    }
    this._pruneToSelection(selectedRowIndexes);
    this._onRunSetup();
    try {
      const message = this.endpoint.action(this.ss, {
        selectedRowIndexes,
        isChecked,
      });
      this._clearSelection();
      this._applyRunState("succeeded", { message });
    } catch (error) {
      this._onRunError(error);
    } finally {
      this.ss.batchUpdateGSheets();
    }
  }
  private _checkboxColumn(
    columnName: CheckboxColumnName<SN>,
  ): CheckboxColumnOperator<SN, CheckboxColumnName<SN>> {
    return new CheckboxColumnOperator({
      ...this.sheetNamedProps,
      columnName,
    });
  }
  // Prepped rather than fetched, so the selection rides the cycle already running.
  private _prepSelectorFetch(): void {
    const { selector } = this.endpoint;
    if (!selector) return;
    this._checkboxColumn(selector.column).column.prepFetchFull();
  }
  // No selector means every data row that holds data; a blank row is no record.
  private _selectedRowIndexes(): number[] {
    const { selector } = this.endpoint;
    if (!selector) return this.sheet.rowIndexesFullWithData;
    return this._checkboxColumn(selector.column).rowIndexesChecked;
  }
  // The entry cell is a button unless the endpoint also runs on unticking.
  private _resetEntryCheckbox(): void {
    if (this.endpoint.runsOnUncheck) return;
    this.sheet.meta.column(this.entryColumnName).actionRowToDefault();
  }
  // Unselected rows go inactive, so every later read of active rows is the selection.
  private _pruneToSelection(selectedRowIndexes: number[]): void {
    if (!this.endpoint.selector) return;
    this.sheet.raw.removeRowsExcept(...selectedRowIndexes);
  }
  // The flush is what puts the running state on the sheet before the work runs.
  private _onRunSetup(): void {
    this._applyRunState("running", { startTime: Tim.nowTimestamp() });
    this.ss.batchUpdateGSheets();
  }
  // Inside the run's `try`, so an action that throws has its clearing discarded too.
  private _clearSelection(): void {
    const { selector } = this.endpoint;
    if (!selector || selector.retainsSelection) return;
    this._checkboxColumn(selector.column).uncheckActiveCells();
  }
  // The timestamp is written once at setup; a state change only recolours it.
  private _applyRunState(
    stateName: RunStateName,
    { startTime, message }: RunStateProps = {},
  ): void {
    const state = runStates[stateName];
    const { timeLastRan, runStatus } = this.endpoint;
    this._updateFeedbackCells(timeLastRan, {
      value: startTime,
      backgroundColor: state.backgroundColor,
    });
    this._updateFeedbackCells(runStatus, { value: message ?? state.message });
  }
  private _updateFeedbackCells(
    columnName: FeedbackColumnName<SN> | undefined,
    change: CellChange<"string">,
  ): void {
    if (!columnName) return;
    // Re-deriving the value type here would compose two mapped filters, at ~43k instantiations.
    const column = this.sheet.columnIndexed(columnName);
    if (this.endpoint.selector) {
      column.updateActiveCells(change);
    } else {
      column.updateAllCells(change);
    }
  }
  // Queued changes are shared by reference, so a half-finished run must be dropped before status is written.
  private _onRunError(error: unknown): void {
    this.ss.discardQueuedChanges();
    this._applyRunState("failed", { message: String(error) });
    Logger.log(`Endpoint run failed: ${String(error)}`);
  }
}
