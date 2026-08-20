import type { GoogleUpdateRequest } from "../../00_base/AppsScriptTypes";
import type { CellValue } from "../../00_base/base";
import type { GridRangeProps } from "./AccessorsRaw";

const updateRequestNames = [
  "append",
  "update",
  "delete",
  "sort",
  "insertColumn",
] as const;
export type UpdateRequestName = (typeof updateRequestNames)[number];

export interface RawState {
  allSheetPropertiesAreFetched: boolean;
  changesToSave: ChangesToSave;
  fetcherGridRanges: GridRangeProps[];
  updateRequests: Record<UpdateRequestName, GoogleUpdateRequest[]>;
  sheets: RawSheetsState;
}

export type RawSheetsState = Map<SheetId, RawSheetState>;

export interface RawSheetState {
  title: string | null;
  activeTable: {
    tableId: string;
    startRowIndex: number; // headerRowIndex
    endRowIndex: number; // lastRowIndex + 1
    startColumnIndex: number;
    endColumnIndex: number; // lastColumnIndex + 1
  } | null;
  preFetchGridRanges: PreFetchGridRange[];
  rowIndexesAreValid: boolean;
  firstStaleColIndex: number | null;
  indexesOfFullRowsToFetch: Set<RowIdx>;
  indexesOfColDataToFetch: Set<ColIdx>;
  rowStates: RawRowStates;
}

interface FullRowPreFetch {
  row: number;
  column: "allDataColumns";
}
interface FullColumnPreFetch {
  column: string;
  row: "allDataRows";
}
interface SingleCellPreFetch {
  row: number;
  column: string;
}

export type PreFetchType = keyof PreFetchTypes;
interface PreFetchTypes {
  fullRow: FullRowPreFetch;
  fullDataColumn: FullColumnPreFetch;
  singleCell: SingleCellPreFetch;
}
export type PreFetchGridRange = PreFetchTypes[PreFetchTypeName];
type PreFetchTypeName = keyof PreFetchTypes;

export function isPreFetchType<PFN extends PreFetchTypeName>(
  preFetch: PreFetchGridRange,
  pfName: PFN,
): preFetch is PreFetchTypes[PFN] {
  if (pfName === "fullRow") {
    return preFetch.column === "allDataColumns";
  } else if (pfName === "fullDataColumn") {
    return preFetch.row === "allDataRows";
  } else if (pfName === "singleCell") {
    return (
      preFetch.row !== "allDataRows" && preFetch.column !== "allDataColumns"
    );
  } else {
    return false;
  }
}

export type RawRowStates = Map<RowIdx, RawRowState>;
export type RawRowState = Map<ColIdx, CellValue>;
type SheetId = number;
type RowIdx = number;
type ColIdx = number;
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
  delete: null | GoogleAppsScript.Sheets.Schema.Request;
  update: Set<ColIdx>;
};
export type SheetChangesToSave = {
  level: "sheet";
  sort: null | SortParameters;
  insertColumn: null | ColIdx;
};

export interface SheetChangeSortProps extends SortParameters {
  action: "sort";
}

export type SheetChangePropsObj = {
  sort: SheetChangeSortProps;
  insertColumn: {
    action: "insertColumn";
    startColumnIndex: number;
  };
};
export type SheetChangeProps = SheetChangePropsObj[keyof SheetChangePropsObj];

export type RowChangeUpdateProps = { action: "update"; colIdxes: number[] };
export type RowChangeProps =
  | { action: "append" | "delete" }
  | RowChangeUpdateProps;

export type ColumnSpecifierRaw = ColIdx[] | "allColumns";
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
