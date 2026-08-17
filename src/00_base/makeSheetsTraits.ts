export const BaseSheetNames = [
  "Spreadsheet Controls",
  "Value Config",
  "Column Config",
  "Sheet Config",
  "Spreadsheet Config",
  "Test",
] as const;

export interface SheetTrait<H extends boolean = boolean> {
  sheetGid: number;
  hasIdColumn: H;
  idPrefix: string;
}

function makeSheetTraits<H extends boolean = false>(
  sheetGid: number,
  idPrefix: string,
  hasIdColumn: H = false as H,
): SheetTrait<H> {
  return {
    sheetGid,
    idPrefix,
    hasIdColumn,
  };
}
export const mst = makeSheetTraits;

export type SheetTraitsBase = Record<string, SheetTrait>;

export function makeSheetsTraits<T extends SheetTraitsBase>(
  allSheetTraits: T,
): T {
  return allSheetTraits;
}
