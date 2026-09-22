// PROTOTYPE #114, throwaway. Variant 1: the framework declares Register; the app augments it.
export type ConfigSetBase = {
  sheetConfigs: { readonly [sheet: string]: { readonly sheetGid: number } };
  columnConfigs: {
    readonly [sheet: string]: {
      readonly [col: string]: { readonly header: string; readonly valueName: string };
    };
  };
};

// Empty until a program augments it with `configs: <the set>`.
export interface Register {}
export type Configs = Register extends { configs: infer C extends ConfigSetBase }
  ? C
  : ConfigSetBase;

type ValueOf<VN> = VN extends "number" ? number : VN extends "checkbox" ? boolean : string;

export type SheetName = keyof Configs["columnConfigs"] & string;
export type ColumnName<SN extends SheetName> = SN extends SheetName
  ? keyof Configs["columnConfigs"][SN] & string
  : never;
export type ColumnValue<SN extends SheetName, CN extends ColumnName<SN>> = SN extends SheetName
  ? CN extends keyof Configs["columnConfigs"][SN]
    ? ValueOf<Configs["columnConfigs"][SN][CN]["valueName" & keyof Configs["columnConfigs"][SN][CN]]>
    : never
  : never;

// Runtime values can't ride the augmentation, so they're registered at startup.
let registered: ConfigSetBase | null = null;
export function registerConfigs(configs: Configs): void {
  registered = configs;
}
export function configs(): Configs {
  if (!registered) throw new Error("registerConfigs() was never called");
  return registered as Configs;
}
// Was a module-level const (sheetConfigsTypes.ts:30); it must become lazy.
export function sheetNameByGid(gid: number): SheetName | undefined {
  const sheetConfigs: ConfigSetBase["sheetConfigs"] = configs().sheetConfigs;
  return Object.keys(sheetConfigs).find((k) => sheetConfigs[k]!.sheetGid === gid) as SheetName | undefined;
}
