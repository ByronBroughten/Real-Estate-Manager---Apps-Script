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

type SheetConfigsIndexed = KeyedMap<SheetConfigs, "sheetGid", "sheetName">;
export const sheetConfigsIndexed = Obj.toKeyedMap(
  sheetConfigs,
  "sheetGid",
  "sheetName",
);

export const configSheetGids = [...sheetConfigsIndexed.keys()];

type SheetConfigIndexed =
  SheetConfigsIndexed extends Map<any, infer V> ? V : never;

export type SheetTraitIndexed<K extends SheetTraitIndexedKey> =
  SheetConfigIndexed[K];

export type SheetTraitIndexedKey = keyof SheetConfigIndexed;
export function getSheetTraitByGid<K extends SheetTraitIndexedKey>(
  sheetGid: number,
  key: K,
): SheetTraitIndexed<K> {
  return sheetConfigsIndexed.get(sheetGid)![key];
}
