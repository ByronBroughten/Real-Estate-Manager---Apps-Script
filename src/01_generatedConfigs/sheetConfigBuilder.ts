export interface SheetConfig<H extends boolean = boolean> {
  sheetGid: number;
  hasIdColumn: H;
  idPrefix: string;
}

export function makeSheetConfig<H extends boolean = false>(
  sheetGid: number,
  idPrefix: string,
  hasIdColumn: H = false as H,
): SheetConfig<H> {
  return {
    sheetGid,
    idPrefix,
    hasIdColumn,
  };
}
export const msc = makeSheetConfig;

export type SheetConfigsBase = Record<string, SheetConfig>;
