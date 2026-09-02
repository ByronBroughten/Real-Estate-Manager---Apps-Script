import type { SpreadsheetNamedProps } from "../04_SpreadsheetNamed/ClassBases/SpreadsheetNamedBase";
import { RunnerEndpointHandler } from "./RunnerEndpointHandler";

export class FillRowIdsEndpoint extends RunnerEndpointHandler<
  "spreadsheetControls",
  "fillRowIds"
> {
  static init(props: SpreadsheetNamedProps): FillRowIdsEndpoint {
    return new FillRowIdsEndpoint({
      sheetName: "spreadsheetControls",
      stem: "fillRowIds",
      ...props,
    });
  }
  execute(): void {
    this.runEndpoint(() => {
      this.ss.fillMissingRowIds();
    });
  }
}
