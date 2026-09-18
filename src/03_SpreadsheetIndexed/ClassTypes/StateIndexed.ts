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
  fetchQueue: SheetFetchQueueIndexed;
}

export interface SheetFetchQueueIndexed {
  targets: FetchTargetIndexed[];
  gatherConditionalFormats: boolean;
  gatherProtectedRanges: boolean;
}

export function emptySheetFetchQueueIndexed(): SheetFetchQueueIndexed {
  return {
    targets: [],
    gatherConditionalFormats: false,
    gatherProtectedRanges: false,
  };
}

type SheetId = number;

interface FullRowTarget {
  kind: "fullRow";
  row: number;
}
interface FullColumnTarget {
  kind: "fullDataColumn";
  column: string;
}
interface CellTarget {
  kind: "singleCell";
  row: number;
  column: string;
}

export type FetchTargetIndexed = FullRowTarget | FullColumnTarget | CellTarget;
