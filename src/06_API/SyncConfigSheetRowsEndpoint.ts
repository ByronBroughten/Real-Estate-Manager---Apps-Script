import type { SpreadsheetNamedProps } from "../04_SpreadsheetNamed/ClassBases/SpreadsheetNamedBase";
import { ConfigOrchestrator } from "../05_Operators/ConfigOrchestrator";
import { RunnerEndpointHandler } from "./RunnerEndpointHandler";

export class SyncConfigSheetRowsEndpoint extends RunnerEndpointHandler<
  "spreadsheetControls",
  "syncConfigSheetRows"
> {
  static init(props: SpreadsheetNamedProps): SyncConfigSheetRowsEndpoint {
    return new SyncConfigSheetRowsEndpoint({
      sheetName: "spreadsheetControls",
      stem: "syncConfigSheetRows",
      ...props,
    });
  }
  get configOrchestrator(): ConfigOrchestrator {
    return new ConfigOrchestrator(this.spreadsheetNamedProps);
  }
  execute(): void {
    this.runEndpoint(() => {
      this.configOrchestrator.syncConfigSheetRows();
    });
  }
}
