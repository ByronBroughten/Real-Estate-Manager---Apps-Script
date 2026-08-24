export interface SheetConfigStored<H extends boolean = boolean> {
  sheetGid: number;
  hasIdColumn: H;
  idPrefix: string;
}
// The full record: everything in SheetConfigStored, plus sheetName, which
// isn't stored on the literal entry itself (it's the entry's key in
// sheetConfigs.ts) but is available as a trait via getSheetTraitByName /
// getSheetTraitByGid regardless of which way the record was looked up.
export interface SheetConfig<
  H extends boolean = boolean,
> extends SheetConfigStored<H> {
  sheetName: string;
}

export function makeSheetConfig<H extends boolean = false>(
  sheetGid: number,
  idPrefix: string,
  hasIdColumn: H = false as H,
): SheetConfigStored<H> {
  return {
    sheetGid,
    idPrefix,
    hasIdColumn,
  };
}
export const msc = makeSheetConfig;

export type SheetConfigsBase = Record<string, SheetConfigStored>;

export function makeSheetConfigs<T extends SheetConfigsBase>(
  sheetConfigs: T,
): T {
  return sheetConfigs;
}
