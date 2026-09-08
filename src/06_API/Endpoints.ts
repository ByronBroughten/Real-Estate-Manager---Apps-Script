import type {
  ColumnFullName,
  ColumnNameFiltered,
  SheetNameOf,
} from "../01_generatedConfigs/columnConfigsTypes";
import type { SheetNameSimple } from "../01_generatedConfigs/sheetConfigsTypes";
import type { SpreadsheetNamed } from "../04_SpreadsheetNamed/SpreadsheetNamed";
import type { CheckboxColumnName } from "../05_Operators/CheckboxColumnOperator";

// The only columns a run can report into: writable, and holding a sentence.
export type FeedbackColumnName<SN extends SheetNameSimple> = ColumnNameFiltered<
  SN,
  "string",
  false
>;

export interface EndpointArgs {
  selectedRowIndexes: number[];
  isChecked: boolean;
}

// `void`, so an action with nothing to report needs no explicit `undefined`.
export type EndpointAction = (
  ss: SpreadsheetNamed,
  args: EndpointArgs,
) => string | void;

export interface Endpoint<SN extends SheetNameSimple> {
  action: EndpointAction;
  timeLastRan?: FeedbackColumnName<SN>;
  runStatus?: FeedbackColumnName<SN>;
  selector?: CheckboxColumnName<SN>;
  runsOnUncheck?: boolean;
}

// Each key carries its own sheet, so a column from another sheet is unnameable.
// Annotate a map with this rather than passing it through makeStructuredConfig,
// which lets an unknown key through whenever a valid key sits beside it.
export type Endpoints = { [FN in ColumnFullName]?: Endpoint<SheetNameOf<FN>> };
