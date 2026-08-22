import type { StrictOmit, StrictPick } from "../../utils/Obj";

export type GridRangeProps = {
  sheetId: number;
  startRowIndex: number;
  endRowIndex?: number;
  startColumnIndex: number;
  endColumnIndex?: number;
};

export type SheetGridRangeProps = StrictOmit<GridRangeProps, "sheetId">;
export type ColumnGridRangeProps = StrictOmit<
  GridRangeProps,
  "sheetId" | "startColumnIndex" | "endColumnIndex"
>;

export type SheetColumnsRange = StrictPick<
  GridRangeProps,
  "startColumnIndex" | "endColumnIndex" | "sheetId"
>;
export type ColumnRange = StrictPick<
  GridRangeProps,
  "startColumnIndex" | "endColumnIndex"
>;
