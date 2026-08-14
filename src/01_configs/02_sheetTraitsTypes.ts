import { Obj, type KeyedMap } from "../utils/Obj";
import { sheetConfigs } from "./02_sheetConfigs";

// Pre-sheetConfigs
export interface SheetConfig {
  sheetGid: number;
  idPrefix: string;
  hasIdColumn: boolean;
}
export function makeSheetConfig(
  sheetGid: number,
  idPrefix: string,
  hasIdColumn = false,
): SheetConfig {
  return {
    sheetGid,
    idPrefix,
    hasIdColumn,
  };
}
export type SheetConfigsBase = Record<string, SheetConfig>;

// Post-sheetConfigs
type SheetConfigs = typeof sheetConfigs;
export const schemaSheetNames = Obj.keys(sheetConfigs);
export type SheetNameSimple = (typeof schemaSheetNames)[number];
export type SheetName<TN extends SheetNameSimple = SheetNameSimple> = TN;

export function getSheetTraitByName<
  TN extends SheetNameSimple,
  K extends keyof SheetConfig,
>(sheetName: TN, key: K): SheetConfig[K] {
  return sheetConfigs[sheetName][key];
}

type SheetTraitsByGid = KeyedMap<SheetConfigs, "sheetGid", "sheetName">;
export const sheetTraitsByGid = Obj.toKeyedMap(
  sheetConfigs,
  "sheetGid",
  "sheetName",
);

export const schemaSheetGids = [...sheetTraitsByGid.keys()];

type SheetTraitsRaw = SheetTraitsByGid extends Map<any, infer V> ? V : never;

export type SheetTraitRaw<K extends SheetTraitRawKey> = SheetTraitsRaw[K];

export type SheetTraitRawKey = keyof SheetTraitsRaw;
export function getSheetTraitByGid<K extends SheetTraitRawKey>(
  sheetGid,
  key: K,
): SheetTraitRaw<K> {
  return sheetTraitsByGid[sheetGid][key];
}
