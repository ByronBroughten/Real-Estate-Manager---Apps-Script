import type { RgbColor } from "../../00_base/RgbColor";
import type { Value, ValueName } from "../../01_generatedConfigs/valueSchemas";

// Mirrors the raw queued entry's optional pair, so a run can write either or both.
export interface CellChange<VN extends ValueName = ValueName> {
  value?: Value<VN>;
  backgroundColor?: RgbColor;
}

export interface StateIndexed {
  sheets: SheetsStateIndexed;
}

export type SheetsStateIndexed = Map<SheetId, SheetStateIndexed>;

export interface SheetStateIndexed {
  fetchTargets: FetchTargetIndexed[];
  prepFetchConditionalFormats: boolean;
  prepFetchProtectedRanges: boolean;
}

type SheetId = number;

interface FullRowTarget {
  row: number;
  column: "allDataColumns";
}
interface FullColumnTarget {
  column: string;
  row: "allDataRows";
}
interface CellTarget {
  row: number;
  column: string;
}

interface FetchTargetTypes {
  fullRow: FullRowTarget;
  fullDataColumn: FullColumnTarget;
  singleCell: CellTarget;
}
export type FetchTargetIndexed = FetchTargetTypes[FetchTargetTypeName];
type FetchTargetTypeName = keyof FetchTargetTypes;

export function isFetchTargetType<FTN extends FetchTargetTypeName>(
  target: FetchTargetIndexed,
  typeName: FTN,
): target is FetchTargetTypes[FTN] {
  if (typeName === "fullRow") {
    return target.column === "allDataColumns";
  } else if (typeName === "fullDataColumn") {
    return target.row === "allDataRows";
  } else if (typeName === "singleCell") {
    return target.row !== "allDataRows" && target.column !== "allDataColumns";
  } else {
    return false;
  }
}
