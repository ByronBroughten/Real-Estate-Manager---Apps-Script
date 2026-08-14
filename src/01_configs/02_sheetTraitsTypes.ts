import { Obj, type KeyedMap } from "../utils/Obj";
import { sheetTraits } from "./02_sheetTraits";

// Pre-sheetTraits
export interface SheetTrait {
  sheetGid: number;
  idPrefix: string;
  hasIdColumn: boolean;
}
export function makeSheetTrait(
  sheetGid: number,
  idPrefix: string,
  hasIdColumn = false,
): SheetTrait {
  return {
    sheetGid,
    idPrefix,
    hasIdColumn,
  };
}
export type SheetTraitsBase = Record<string, SheetTrait>;

// Post-sheetTraits
type SheetTraits = typeof sheetTraits;
export const schemaSheetNames = Obj.keys(sheetTraits);
export type SheetNameSimple = (typeof schemaSheetNames)[number];
export type SheetName<TN extends SheetNameSimple = SheetNameSimple> = TN;

export function getSheetTraitByName<
  TN extends SheetNameSimple,
  K extends keyof SheetTrait,
>(sheetName: TN, key: K): SheetTrait[K] {
  return sheetTraits[sheetName][key];
}

type SheetTraitsByGid = KeyedMap<SheetTraits, "sheetGid", "sheetName">;
export const sheetTraitsByGid = Obj.toKeyedMap(
  sheetTraits,
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
