import type { GoogleColor } from "../../00_base/AppsScriptTypes";
import type { Value, ValueName } from "../../01_generatedConfigs/valueSchemas";

// Mirrors the raw queued entry's optional pair, so a run can write either or both.
export interface CellChange<VN extends ValueName = ValueName> {
  value?: Value<VN>;
  backgroundColor?: GoogleColor;
}

export interface IndexedState {
  sheets: IndexedSheetsState;
}

export type IndexedSheetsState = Map<SheetId, IndexedSheetState>;

export interface IndexedSheetState {
  preFetchGridRanges: PreFetchGridRange[];
}

type SheetId = number;

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
