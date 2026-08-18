import type { SheetTrait } from "../00_base/makeSheetsTraits";
import { Obj, type KeyedMap } from "../utils/Obj";
import { allSheetTraits } from "./02_sheetTraits";

// Post-allSheetTraits
export type SheetTraits = typeof allSheetTraits;
export const schemaSheetNames = Obj.keys(allSheetTraits);
export type SheetNameSimple = (typeof schemaSheetNames)[number];
export type SheetName<TN extends SheetNameSimple = SheetNameSimple> = TN;

export function getSheetTraitByName<
  TN extends SheetNameSimple,
  K extends keyof SheetTrait,
>(sheetName: TN, key: K): SheetTrait[K] {
  return allSheetTraits[sheetName][key];
}

type SheetTraitsByGid = KeyedMap<SheetTraits, "sheetGid", "sheetName">;
export const sheetTraitsByGid = Obj.toKeyedMap(
  allSheetTraits,
  "sheetGid",
  "sheetName",
);

export const schemaSheetGids = [...sheetTraitsByGid.keys()];

type SheetTraitsRaw = SheetTraitsByGid extends Map<any, infer V> ? V : never;

export type SheetTraitRaw<K extends SheetTraitRawKey> = SheetTraitsRaw[K];

export type SheetTraitRawKey = keyof SheetTraitsRaw;
export function getSheetTraitByGid<K extends SheetTraitRawKey>(
  sheetGid: number,
  key: K,
): SheetTraitRaw<K> {
  return sheetTraitsByGid.get(sheetGid)![key];
}
