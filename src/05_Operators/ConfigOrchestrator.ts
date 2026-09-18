import {
  clearSpreadsheetConfigOverlay,
  overlaySpreadsheetConfig,
} from "../01_generatedConfigs/spreadsheetConfigTypes";
import {
  SpreadsheetBaseNamed,
  type SpreadsheetNamedProps,
} from "../04_SpreadsheetNamed/ClassBases/SpreadsheetBaseNamed";
import { SpreadsheetNamed } from "../04_SpreadsheetNamed/SpreadsheetNamed";
import { ColumnConfigOperator } from "./ColumnConfigOperator";
import { OperatorBase } from "./OperatorBase";
import { SheetConfigOperator } from "./SheetConfigOperator";
import { SpreadsheetConfigOperator } from "./SpreadsheetConfigOperator";
import { ValueConfigOperator } from "./ValueConfigOperator";

export interface ConfigRegeneration {
  spreadsheetConfig: string;
  sheetConfigs: string;
  columnConfigs: string;
  valueConfigs: string;
  untypedColumnsSummary: string | undefined;
}

/**
 * Coordinates Spreadsheet/Sheet/Column/Value Config: overlay live layout,
 * sync the live config sheets, one flush, then emit all four generated
 * files or none. Config maintenance is this Operator family, not Raw or Named.
 * npm run gen:configs is the only regeneration path.
 * docs/generated-data.md
 */
export class ConfigOrchestrator extends OperatorBase {
  constructor(props: SpreadsheetNamedProps) {
    super({
      ...props,
      configSyncState: OperatorBase.initConfigSyncState(),
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
  // Returns the run status an endpoint should report, if there's one to make.
  syncConfigSheetRows(): string | undefined {
    return this._withLiveSpreadsheetConfig(() => this._syncConfigSheetRows());
  }
  syncAndFlushConfigSheets(): string | undefined {
    return this._withLiveSpreadsheetConfig(() => {
      const summary = this._syncConfigSheetRows();
      this.ss.batchUpdateGSheets();
      return summary;
    });
  }
  generateConfigFiles(): ConfigRegeneration {
    return this._withLiveSpreadsheetConfig(() => {
      const untypedColumnsSummary = this._syncConfigSheetRows();
      this.ss.batchUpdateGSheets();
      this.valueConfigOperator.fetchAfterColumnConfigSynced();
      return {
        spreadsheetConfig: this.spreadsheetConfigOperator.toFileSource(),
        sheetConfigs: this.sheetConfigOperator.toFileSource(),
        columnConfigs: this.columnConfigOperator.toFileSource(),
        valueConfigs: this.valueConfigOperator.toFileSource(),
        untypedColumnsSummary,
      };
    });
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
