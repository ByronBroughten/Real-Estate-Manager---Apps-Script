import { lazy } from "../utils/lazy";
import { Obj } from "../utils/Obj";
import { type Configs, installedConfigs } from "./configRegister";
import type { SheetConfigsBase, SheetConfigStored } from "./makeConfigs";

// Post-sheetConfigs
export type SheetConfigs = Configs["sheetConfigs"];
export type SheetNameSimple = keyof SheetConfigs & string;
export function configSheetNames(): SheetNameSimple[] {
  return Obj.keys(sheetConfigs()) as SheetNameSimple[];
}
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
  return sheetConfigs()[sheetName][
    key as keyof SheetConfigStored
  ] as SheetConfig[K];
}

export const sheetConfigsByGid = lazy(() =>
  Obj.toKeyedMap(sheetConfigs(), "sheetGid", "sheetName"),
);

export function getSheetTraitByGid<K extends keyof SheetConfig>(
  sheetGid: number,
  key: K,
): SheetConfig[K] {
  return sheetConfigsByGid().get(sheetGid)![key];
}

// The generated literal read by an arbitrary name, where an entry may be absent.
export function sheetConfigsByName(): SheetConfigsBase {
  return sheetConfigs();
}

function sheetConfigs(): SheetConfigs {
  return installedConfigs().sheetConfigs;
}
