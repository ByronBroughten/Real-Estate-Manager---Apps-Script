import { lazy } from "../utils/lazy";
import { Obj } from "../utils/Obj";
import type { SheetConfigsBase, SheetConfigStored } from "./makeConfigs";
import { sheetConfigs } from "./generated/sheetConfigs";

// Post-sheetConfigs
export type SheetConfigs = typeof sheetConfigs;
export const configSheetNames = lazy(() => Obj.keys(sheetConfigs));
export type SheetNameSimple = ReturnType<typeof configSheetNames>[number];
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

export const sheetConfigsByGid = lazy(() =>
  Obj.toKeyedMap(sheetConfigs, "sheetGid", "sheetName"),
);

export const configSheetGids = lazy(() => [...sheetConfigsByGid().keys()]);

export function getSheetTraitByGid<K extends keyof SheetConfig>(
  sheetGid: number,
  key: K,
): SheetConfig[K] {
  return sheetConfigsByGid().get(sheetGid)![key];
}

// The generated literal read by an arbitrary name, where an entry may be absent.
export function sheetConfigsByName(): SheetConfigsBase {
  return sheetConfigs;
}
