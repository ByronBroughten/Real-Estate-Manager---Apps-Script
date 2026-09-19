import {
  clearSpreadsheetConfigOverlay,
  overlaySpreadsheetConfig,
} from "../01_SpreadsheetSchema/spreadsheetConfigTypes";
import {
  SpreadsheetBaseNamed,
  type SpreadsheetNamedProps,
} from "../04_SpreadsheetNamed/ClassBases/SpreadsheetBaseNamed";
import { SpreadsheetNamed } from "../04_SpreadsheetNamed/SpreadsheetNamed";
import { ColumnConfigOperator } from "./ColumnConfigOperator";
import { ConfigSheetFloor } from "./ConfigSheetFloor";
import { SheetConfigOperator } from "./SheetConfigOperator";
import { SpreadsheetBaseOperator } from "./SpreadsheetBaseOperator";
import { SpreadsheetConfigOperator } from "./SpreadsheetConfigOperator";
import { ValueConfigOperator } from "./ValueConfigOperator";

export interface ConfigRegeneration {
  spreadsheetConfig: string;
  sheetConfigs: string;
  columnConfigs: string;
  valueConfigs: string;
  untypedColumnsSummary: string | undefined;
  floorReport: string;
  idPrefixReport: string | undefined;
}

/**
 * Coordinates Spreadsheet/Sheet/Column/Value Config: the config-sheet floor
 * first (one extra flush), overlay live layout, sync the live config sheets,
 * one more flush, then emit all four generated files or none. Config
 * maintenance is this Operator family, not Raw or Named. npm run gen:configs
 * is the only regeneration path.
 * docs/generated-data.md
 */
export class ConfigOrchestrator extends SpreadsheetBaseOperator {
  constructor(props: SpreadsheetNamedProps) {
    super({
      ...props,
      configSyncState: SpreadsheetBaseOperator.initConfigSyncState(),
    });
  }
  static init(): ConfigOrchestrator {
    return new ConfigOrchestrator(
      SpreadsheetBaseNamed.initSpreadsheetNamedProps(),
    );
  }
  get ss(): SpreadsheetNamed {
    return new SpreadsheetNamed(this.spreadsheetNamedProps);
  }
  get spreadsheetConfigOperator() {
    return new SpreadsheetConfigOperator(this.operatorProps);
  }
  get columnConfigOperator() {
    return new ColumnConfigOperator(this.operatorProps);
  }
  get sheetConfigOperator() {
    return new SheetConfigOperator(this.operatorProps);
  }
  get valueConfigOperator() {
    return new ValueConfigOperator(this.operatorProps);
  }
  get configSheetFloor() {
    return new ConfigSheetFloor(this.spreadsheetNamedProps);
  }
  ensureConfigSheetFloor(): string {
    return this.configSheetFloor.ensure();
  }
  // Returns the run status an endpoint should report, if there's one to make.
  syncConfigSheetRows(): string | undefined {
    return this._withFloorThenLiveConfig((floorReport) =>
      combineConfigSyncReports(floorReport, this._syncConfigSheetRows()),
    );
  }
  syncAndFlushConfigSheets(): string | undefined {
    return this._withFloorThenLiveConfig((floorReport) => {
      const summary = combineConfigSyncReports(
        floorReport,
        this._syncConfigSheetRows(),
      );
      this.ss.batchUpdateGSheets();
      return summary;
    });
  }
  generateConfigFiles(): ConfigRegeneration {
    return this._withFloorThenLiveConfig((floorReport) => {
      const untypedColumnsSummary = this._syncConfigSheetRows();
      this.ss.batchUpdateGSheets();
      this.valueConfigOperator.fetchAfterColumnConfigSynced();
      return {
        spreadsheetConfig: this.spreadsheetConfigOperator.toFileSource(),
        sheetConfigs: this.sheetConfigOperator.toFileSource(),
        columnConfigs: this.columnConfigOperator.toFileSource(),
        valueConfigs: this.valueConfigOperator.toFileSource(),
        untypedColumnsSummary,
        floorReport,
        idPrefixReport: this.sheetConfigOperator.idPrefixChangeReport(),
      };
    });
  }
  private _withFloorThenLiveConfig<T>(body: (floorReport: string) => T): T {
    const floorReport = this.ensureConfigSheetFloor();
    this.ss.batchUpdateGSheets();
    return this._withLiveSpreadsheetConfig(() => body(floorReport));
  }
  private _withLiveSpreadsheetConfig<T>(body: () => T): T {
    const liveConfig = this.spreadsheetConfigOperator.fetchLiveConfig();
    overlaySpreadsheetConfig(liveConfig);
    try {
      return body();
    } finally {
      clearSpreadsheetConfigOverlay();
    }
  }
  private _syncConfigSheetRows(): string | undefined {
    this.ss.fetchAllSheetProperties();
    this.spreadsheetConfigOperator.validateExactlyOneDataRow();
    this.sheetConfigOperator.prepFetchForSync();
    this.columnConfigOperator.prepFetchWithSheetConfig();
    this.ss.fetchAllPrepped({ skipFetchingProperties: true });
    this.sheetConfigOperator.syncToSpreadsheet();
    this.columnConfigOperator.fetchAfterSheetConfigSynced();
    this.columnConfigOperator.syncToSpreadsheet();
    return this.columnConfigOperator.untypedColumnsSummary();
  }
}

function combineConfigSyncReports(
  floorReport: string,
  untypedColumnsSummary: string | undefined,
): string | undefined {
  if (floorReport === "") return untypedColumnsSummary;
  if (untypedColumnsSummary === undefined) return floorReport;
  return `${floorReport} ${untypedColumnsSummary}`;
}
