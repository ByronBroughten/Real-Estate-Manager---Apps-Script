import type { ColumnFullName } from "../01_generatedConfigs/columnConfigsTypes";
import type { SpreadsheetConfig } from "../01_generatedConfigs/spreadsheetConfigTypes";
import type { SpreadsheetNamedProps } from "../04_SpreadsheetNamed/ClassBases/SpreadsheetNamedBase";
import type { FilterWithSuffix } from "../utils/Str";
import { FillRowIdsEndpoint } from "./FillRowIdsEndpoint";
import { SyncConfigSheetRowsEndpoint } from "./SyncConfigSheetRowsEndpoint";

// Intersected with the value filter, so a wrongly-typed action column is a
// compile error rather than a silent runtime no-op.
export type SelectorEndpointName = FilterWithSuffix<
  ColumnFullName<"boolean", false>,
  SpreadsheetConfig["selectorEndpointSuffix"]
>;
export type RunnerEndpointName = FilterWithSuffix<
  ColumnFullName<"string", false>,
  SpreadsheetConfig["runnerEndpointSuffix"]
>;

export interface SelectorEndpointProps extends SpreadsheetNamedProps {
  isSelected: boolean;
}
export type RunnerEndpointRun = (props: SpreadsheetNamedProps) => void;
export type SelectorEndpointRun = (props: SelectorEndpointProps) => void;

// Annotated rather than passed through makeStructuredConfig, which lets an
// unknown key through whenever a valid key sits beside it.
export type Endpoints = Partial<Record<RunnerEndpointName, RunnerEndpointRun>> &
  Partial<Record<SelectorEndpointName, SelectorEndpointRun>>;

export const baseEndpoints: Endpoints = {
  spreadsheetControls_syncConfigSheetRowsTimeLastRan: (props) => {
    SyncConfigSheetRowsEndpoint.init(props).execute();
  },
  spreadsheetControls_fillRowIdsTimeLastRan: (props) => {
    FillRowIdsEndpoint.init(props).execute();
  },
};
