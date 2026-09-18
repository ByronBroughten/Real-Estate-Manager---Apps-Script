import type { ConditionalFormatRule } from "../../00_base/ConditionalFormat";
import type { ProtectedRange } from "../../00_base/ProtectedRange";
import type {
  FindReplaceScope as BaseFindReplaceScope,
  FindReplaceTerms as BaseFindReplaceTerms,
  LocalWriteOperation,
  RawSource,
} from "../../00_base/RawSource";
import type { RgbColor } from "../../00_base/RgbColor";
import type { CellValue, CellValueName } from "../../00_base/base";
import type { GridRangeProps } from "./AccessorsRaw";

export interface StateRaw {
  allSheetPropertiesAreFetched: boolean;
  spreadsheetId: string | null;
  rawSource: RawSource;
  changesToSave: ChangesToSave;
  fetcherGridRanges: GridRangeProps[];
  updateRequests: Record<UpdateRequestName, LocalWriteOperation[]>;
  sheets: SheetsStateRaw;
}

const updateRequestNames = [
  "append",
  "update",
  "delete",
  "sort",
  "insertColumn",
  "fill",
  "findReplace",
  "deleteConditionalFormat",
  "addConditionalFormat",
  "deleteProtectedRange",
  "addProtectedRange",
  "raw",
] as const;
export type UpdateRequestName = (typeof updateRequestNames)[number];

export type SheetsStateRaw = Map<SheetId, SheetStateRaw>;

export interface SheetStateRaw {
  title: string | null;
  knownTable: KnownTableRaw | null;
  hasExtraTables: boolean;
  // A findReplace matches by content, so what it changed is unknowable locally.
  cellStateIsStale: boolean;
  hasFetchedColumnIds: boolean;
  isPrunedToSelection: boolean;
  rowStates: RowStatesRaw;
  // A row an append has handed out, so a second append can't reuse it.
  reservedRowIndexes: Set<RowIndex>;
  columnStates: ColumnStatesRaw;
  rowIndexesToFinalize: Set<RowIndex>;
  colIndexesToFinalize: Set<ColIndex>;
  cellsToFinalize: Map<RowIndex, Set<ColIndex>>;
  gatherConditionalFormats: boolean;
  conditionalFormatRules: ConditionalFormatRule[] | null;
  conditionalFormatIndexesAreStale: boolean;
  gatherProtectedRanges: boolean;
  protectedRanges: ProtectedRange[] | null;
  protectedRangesAreStale: boolean;
}

export type RowStatesRaw = Map<RowIndex, RowStateRaw>;
export type RowStateRaw = Map<ColIndex, CellStateRaw>;
export interface CellStateRaw {
  value: CellValue;
}

export type ColumnStatesRaw = Map<ColIndex, ColumnStateRaw>;
export interface ColumnStateRaw {
  activeFacts?: ActiveFactsRaw;
  validationValues?: string[];
  validationConditionType?: string;
  // Absent for a column left on Automatic, which is what makes it "untyped".
  declaredType?: string;
}
export interface ActiveFactsRaw {
  isFormula: boolean;
  numberFormatType: string | undefined;
  dataValidationConditionType: string | undefined;
  topValue: CellValue;
}

export interface KnownTableRaw {
  tableId: string;
  startRowIndex: number; // tableHeaderRowIndex
  endRowIndex: number; // lastRowIndex + 1
  startColumnIndex: number;
  endColumnIndex: number; // lastColumnIndex + 1
  rowIndexesAreStale: boolean;
  firstStaleColIndex: number | null;
}

type SheetId = number;
type RowIndex = number;
type ColIndex = number;
type SheetRowId = string;

export type SortParameters = {
  colIdxToSortBy: number;
  sortOrder: "ASCENDING" | "DESCENDING";
};

export type ChangesToSave = Map<
  SheetId | SheetRowId,
  RowChangesToSave | SheetChangesToSave
>;
export type RowChangesToSave = {
  level: "row";
  append: boolean;
  delete: boolean;
  // Values, not indexes, so a queued write never depends on fetched row state.
  update: Map<ColIndex, RowCellChange>;
};
// One entry per cell, merged across writes, so a colour never cancels a value or a formula.
export interface RowCellChange<VN extends CellValueName = CellValueName> {
  value?: CellValue<VN>;
  formula?: string;
  backgroundColor?: RgbColor;
}
export type SheetChangesToSave = {
  level: "sheet";
  sort: null | SortParameters;
  insertColumn: null | ColIndex;
  fills: ColumnFill[];
};
// One contiguous run of a column's cells: value/colour as repeatCell, formula as pasteData.
export interface ColumnFill extends RowCellChange {
  colIndex: ColIndex;
  startRowIndex: number;
  // Snapshotted when queued, so a fill never reaches a row appended after it.
  endRowIndex: number;
}

export interface SheetChangeSortProps extends SortParameters {
  action: "sort";
}

export type FindReplaceScope = BaseFindReplaceScope;
export type FindReplaceTerms = BaseFindReplaceTerms;
export interface FindReplaceProps extends FindReplaceTerms {
  scope: FindReplaceScope;
}

export type SheetChangePropsObj = {
  sort: SheetChangeSortProps;
  insertColumn: {
    action: "insertColumn";
    startColumnIndex: number;
  };
  fill: { action: "fill" } & ColumnFill;
};
export type SheetChangeProps = SheetChangePropsObj[keyof SheetChangePropsObj];

export type RowChangeUpdateProps = {
  action: "update";
  colIndex: ColIndex;
} & (
  { value: CellValue } | { formula: string } | { backgroundColor: RgbColor }
);
export type RowChangeProps =
  { action: "append" | "delete" } | RowChangeUpdateProps;

export type ColumnSpecifierRaw = ColIndex[] | "allColumns";
export type ColumnCount = number | "allFromStart";
export type RowCountRaw = number | "allFromStart";

export interface RowRange {
  startRowIndex: number;
  endRowIndex?: number;
}
export function makeRowRange(
  startRowIndex: number,
  endRowIndex?: number,
): RowRange {
  return { startRowIndex, endRowIndex };
}
