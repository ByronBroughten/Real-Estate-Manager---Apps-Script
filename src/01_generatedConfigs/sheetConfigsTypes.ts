import { Obj } from "../utils/Obj";
import type { SheetConfigStored } from "./makeConfigs";
import { sheetConfigs } from "./sheetConfigs";

// Post-sheetConfigs
export type SheetConfigs = typeof sheetConfigs;
export const configSheetNames = Obj.keys(sheetConfigs);
export type SheetNameSimple = (typeof configSheetNames)[number];
export type SheetName<TN extends SheetNameSimple = SheetNameSimple> = TN;
export interface SheetConfig<
  H extends boolean = boolean,
> extends SheetConfigStored<H> {
  sheetName: string;
}

export function getSheetTraitByName<
  TN extends SheetNameSimple,
  K extends keyof SheetConfig,
>(sheetName: TN, key: K): SheetConfig[K] {
  if (key === "sheetName") {
    return sheetName as unknown as SheetConfig[K];
  }
  return sheetConfigs[sheetName][
    key as keyof SheetConfigStored
  ] as SheetConfig[K];
}

export const sheetConfigsIndexed = Obj.toKeyedMap(
  sheetConfigs,
  "sheetGid",
  "sheetName",
);

export const configSheetGids = [...sheetConfigsIndexed.keys()];

export function getSheetTraitByGid<K extends keyof SheetConfig>(
  sheetGid: number,
  key: K,
): SheetConfig[K] {
  return sheetConfigsIndexed.get(sheetGid)![key];
}
