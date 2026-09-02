import type {
  ColumnNameFiltered,
  RunnerStem,
} from "../01_generatedConfigs/columnConfigsTypes";
import {
  ssConfigGet,
  type SpreadsheetConfig,
} from "../01_generatedConfigs/spreadsheetConfigTypes";
import {
  SheetNamedBase,
  type SheetNamedProps,
} from "../04_SpreadsheetNamed/ClassBases/SheetNamedBase";
import type { SheetNameWithRunnerColumns } from "../04_SpreadsheetNamed/SheetNameGroups";

// The stem guarantees the column exists; the value filter is what makes its cells writable as typed.
export type TimeLastRanName<
  SN extends SheetNameWithRunnerColumns,
  ST extends RunnerStem<SN>,
> = `${ST}${SpreadsheetConfig["runnerEndpointSuffix"]}` &
  ColumnNameFiltered<SN, "string", false>;

export type LastRanSucceededName<
  SN extends SheetNameWithRunnerColumns,
  ST extends RunnerStem<SN>,
> = `${ST}${SpreadsheetConfig["runSucceededEndpointSuffix"]}` &
  ColumnNameFiltered<SN, "boolean", false>;

export type ErrorMessageName<
  SN extends SheetNameWithRunnerColumns,
  ST extends RunnerStem<SN>,
> = `${ST}${SpreadsheetConfig["errorMessageEndpointSuffix"]}` &
  ColumnNameFiltered<SN, "string", false>;

export interface RunnerEndpointHandlerProps<
  SN extends SheetNameWithRunnerColumns,
  ST extends RunnerStem<SN>,
> extends SheetNamedProps<SN> {
  stem: ST;
}

export class RunnerEndpointHandlerBase<
  SN extends SheetNameWithRunnerColumns,
  ST extends RunnerStem<SN>,
> extends SheetNamedBase<SN> {
  readonly stem: ST;
  constructor({ stem, ...props }: RunnerEndpointHandlerProps<SN, ST>) {
    super(props);
    this.stem = stem;
  }
  get runnerEndpointHandlerProps(): RunnerEndpointHandlerProps<SN, ST> {
    return {
      ...this.sheetNamedProps,
      stem: this.stem,
    };
  }
  get timeLastRanName(): TimeLastRanName<SN, ST> {
    return `${this.stem}${ssConfigGet("runnerEndpointSuffix")}` as TimeLastRanName<
      SN,
      ST
    >;
  }
  get lastRanSucceededName(): LastRanSucceededName<SN, ST> {
    return `${this.stem}${ssConfigGet(
      "runSucceededEndpointSuffix",
    )}` as LastRanSucceededName<SN, ST>;
  }
  get errorMessageName(): ErrorMessageName<SN, ST> {
    return `${this.stem}${ssConfigGet(
      "errorMessageEndpointSuffix",
    )}` as ErrorMessageName<SN, ST>;
  }
}
