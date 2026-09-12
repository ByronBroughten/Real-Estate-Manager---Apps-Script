import { SpreadsheetNamedBase } from "../04_SpreadsheetNamed/ClassBases/SpreadsheetNamedBase";
import { SpreadsheetNamed } from "../04_SpreadsheetNamed/SpreadsheetNamed";
import { ColumnConfigOperator } from "./ColumnConfigOperator";
import { SheetConfigOperator } from "./SheetConfigOperator";
import { ValueConfigOperator } from "./ValueConfigOperator";

export interface ConfigRegeneration {
  sheetConfigs: string;
  columnConfigs: string;
  valueConfigs: string;
  untypedColumnsSummary: string | undefined;
}

/**
 * Coordinates Sheet/Column/Value Config: sync the live config sheets,
 * one flush, then emit all three generated files or none.
 * Config maintenance is this Operator family, not Raw or Named.
 * Sheet Config then Column Config share one operator so both queues
 * plus column IDs written to business sheets flush together.
 * npm run gen:configs is the only regeneration path.
 * docs/generated-data.md
 */
export class ConfigOrchestrator extends SpreadsheetNamedBase {
  static init(): ConfigOrchestrator {
    return new ConfigOrchestrator(
      ConfigOrchestrator.initSpreadsheetNamedProps(),
    );
  }
  get ss(): SpreadsheetNamed {
    return new SpreadsheetNamed(this.spreadsheetNamedProps);
  }
  get columnConfigOperator() {
    return new ColumnConfigOperator(this.spreadsheetNamedProps);
  }
  get sheetConfigOperator() {
    return new SheetConfigOperator(this.spreadsheetNamedProps);
  }
  get valueConfigOperator() {
    return new ValueConfigOperator(this.spreadsheetNamedProps);
  }
  // Returns the run status an endpoint should report, if there's one to make.
  syncConfigSheetRows(): string | undefined {
    this.ss.fetchAllSheetProperties();
    this.sheetConfigOperator.prepFetchForSync();
    this.columnConfigOperator.prepFetchWithSheetConfig();
    this.ss.fetchAllPrepped({ skipFetchingProperties: true });
    this.sheetConfigOperator.syncToSpreadsheet();
    this.columnConfigOperator.fetchAfterSheetConfigSynced();
    this.columnConfigOperator.syncToSpreadsheet();
    return this.columnConfigOperator.untypedColumnsSummary();
  }
  syncAndFlushConfigSheets(): string | undefined {
    const summary = this.syncConfigSheetRows();
    this.ss.batchUpdateGSheets();
    return summary;
  }
  generateConfigFiles(): ConfigRegeneration {
    const untypedColumnsSummary = this.syncConfigSheetRows();
    this.ss.batchUpdateGSheets();
    this.valueConfigOperator.fetchAfterColumnConfigSynced();
    return {
      sheetConfigs: this.sheetConfigOperator.toFileSource(),
      columnConfigs: this.columnConfigOperator.toFileSource(),
      valueConfigs: this.valueConfigOperator.toFileSource(),
      untypedColumnsSummary,
    };
  }
}
