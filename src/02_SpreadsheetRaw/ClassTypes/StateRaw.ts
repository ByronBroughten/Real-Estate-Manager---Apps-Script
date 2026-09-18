import type {
  CellValue,
  CellValueName,
} from "../../00_base/CellValues/cellValues";
import type { ConditionalFormatRule } from "../../00_base/RawSource/ConditionalFormat";
import type { ProtectedRange } from "../../00_base/RawSource/ProtectedRange";
import type {
  FindReplaceScope as BaseFindReplaceScope,
  FindReplaceTerms as BaseFindReplaceTerms,
  LocalWriteOperation,
  RawSource,
} from "../../00_base/RawSource/RawSource";
import type { RgbColor } from "../../00_base/RawSource/RgbColor";
import type { GridRangeProps } from "./AccessorsRaw";

export interface StateRaw {
  allSheetPropertiesAreFetched: boolean;
  spreadsheetId: string | null;
  rawSource: RawSource;
  fetchQueue: SpreadsheetFetchQueueRaw;
  writeQueue: SpreadsheetWriteQueueRaw;
  sheets: SheetsStateRaw;
}

export interface SpreadsheetFetchQueueRaw {
  gridRanges: GridRangeProps[];
}

export interface SpreadsheetWriteQueueRaw {
  updateRequests: Record<UpdateRequestName, LocalWriteOperation[]>;
}

export type UpdateRequestName =
  | "append"
  | "update"
  | "delete"
  | "sort"
  | "insertColumn"
  | "fill"
  | "findReplace"
  | "deleteConditionalFormat"
  | "addConditionalFormat"
  | "deleteProtectedRange"
  | "addProtectedRange"
  | "raw";

export type SheetsStateRaw = Map<SheetId, SheetStateRaw>;

export interface SheetStateRaw {
  working: SheetWorkingStateRaw;
  fetchQueue: SheetFetchQueueRaw;
  writeQueue: SheetWriteQueueRaw;
}

export interface SheetWorkingStateRaw {
  title: string | null;
  knownTable: KnownTableRaw | null;
  hasExtraTables: boolean;
  // A findReplace matches by content, so what it changed is unknowable locally.
  cellStateIsStale: boolean;
  hasFetchedColumnIds: boolean;
  isPrunedToSelection: boolean;
  rowStates: RowStatesRaw;
  columnStates: ColumnStatesRaw;
  conditionalFormats: ConditionalFormatsStateRaw;
  protectedRanges: ProtectedRangesStateRaw;
}

export interface ConditionalFormatsStateRaw {
  rules: ConditionalFormatRule[] | null;
  isStale: boolean;
}

export interface ProtectedRangesStateRaw {
  ranges: ProtectedRange[] | null;
  isStale: boolean;
}

export interface SheetFetchQueueRaw {
  gatherConditionalFormats: boolean;
  gatherProtectedRanges: boolean;
  toFinalize: SheetFinalizeQueueRaw;
}

export interface SheetFinalizeQueueRaw {
  rows: Set<RowIndex>;
  columns: Set<ColIndex>;
  cells: Map<RowIndex, Set<ColIndex>>;
}

export interface SheetWriteQueueRaw {
  sheet: SheetChangesToSave;
  rows: Map<RowIndex, RowChangesToSave>;
  // A row an append has handed out, so a second append can't reuse it.
  reservedRowIndexes: Set<RowIndex>;
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

export type SortParameters = {
  colIdxToSortBy: number;
  sortOrder: "ASCENDING" | "DESCENDING";
};

export type RowChangesToSave = {
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

export function emptyUpdateRequests(): Record<
  UpdateRequestName,
  LocalWriteOperation[]
> {
  return {
    append: [],
    update: [],
    delete: [],
    sort: [],
    insertColumn: [],
    fill: [],
    findReplace: [],
    deleteConditionalFormat: [],
    addConditionalFormat: [],
    deleteProtectedRange: [],
    addProtectedRange: [],
    raw: [],
  };
}

export function emptySpreadsheetFetchQueue(): SpreadsheetFetchQueueRaw {
  return { gridRanges: [] };
}

export function emptySpreadsheetWriteQueue(): SpreadsheetWriteQueueRaw {
  return { updateRequests: emptyUpdateRequests() };
}

export function emptySheetChanges(): SheetChangesToSave {
  return { sort: null, insertColumn: null, fills: [] };
}

export function emptyRowChanges(): RowChangesToSave {
  return { append: false, delete: false, update: new Map() };
}

export function emptySheetWriteQueue(): SheetWriteQueueRaw {
  return {
    sheet: emptySheetChanges(),
    rows: new Map(),
    reservedRowIndexes: new Set(),
  };
}

export function emptySheetFetchQueue(): SheetFetchQueueRaw {
  return {
    gatherConditionalFormats: false,
    gatherProtectedRanges: false,
    toFinalize: {
      rows: new Set(),
      columns: new Set(),
      cells: new Map(),
    },
  };
}

export function emptySheetWorkingState(): SheetWorkingStateRaw {
  return {
    title: null,
    knownTable: null,
    hasExtraTables: false,
    cellStateIsStale: false,
    hasFetchedColumnIds: false,
    isPrunedToSelection: false,
    rowStates: new Map(),
    columnStates: new Map(),
    conditionalFormats: { rules: null, isStale: false },
    protectedRanges: { ranges: null, isStale: false },
  };
}

export function emptySheetStateRaw(): SheetStateRaw {
  return {
    working: emptySheetWorkingState(),
    fetchQueue: emptySheetFetchQueue(),
    writeQueue: emptySheetWriteQueue(),
  };
}
