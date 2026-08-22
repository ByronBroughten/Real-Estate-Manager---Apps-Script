import { Obj, type KeyedMap } from "../utils/Obj";
import type { SheetConfig } from "./sheetConfigBuilder";
import { sheetConfigs } from "./sheetConfigs";

// Post-sheetConfigs
export type SheetConfigs = typeof sheetConfigs;
export const configSheetNames = Obj.keys(sheetConfigs);
export type SheetNameSimple = (typeof configSheetNames)[number];
export type SheetName<TN extends SheetNameSimple = SheetNameSimple> = TN;

export function getSheetTraitByName<
  TN extends SheetNameSimple,
  K extends keyof SheetConfig,
>(sheetName: TN, key: K): SheetConfig[K] {
  return sheetConfigs[sheetName][key];
}

type SheetConfigsByGid = KeyedMap<SheetConfigs, "sheetGid", "sheetName">;
export const sheetConfigsByGid = Obj.toKeyedMap(
  sheetConfigs,
  "sheetGid",
  "sheetName",
);

export const configSheetGids = [...sheetConfigsByGid.keys()];

type SheetConfigsRaw = SheetConfigsByGid extends Map<any, infer V> ? V : never;

export type SheetTraitRaw<K extends SheetTraitRawKey> = SheetConfigsRaw[K];

export type SheetTraitRawKey = keyof SheetConfigsRaw;
export function getSheetTraitByGid<K extends SheetTraitRawKey>(
  sheetGid: number,
  key: K,
): SheetTraitRaw<K> {
  return sheetConfigsByGid.get(sheetGid)![key];
}
