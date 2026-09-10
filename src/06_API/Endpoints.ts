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
  // Inline, not a named type: a named one compares by variance, which the widened dispatch boundary rejects.
  selector?: { column: CheckboxColumnName<SN>; retainsSelection?: boolean };
  runsOnUncheck?: boolean;
}

// The entry as the dispatch hands it over — a structural copy, for the same reason.
export type EndpointDispatched<SN extends SheetNameSimple> = {
  [K in keyof Endpoint<SN>]: Endpoint<SN>[K];
};

// Each key carries its own sheet, so a column from another sheet is unnameable.
export type Endpoints = { [FN in ColumnFullName]?: Endpoint<SheetNameOf<FN>> };
