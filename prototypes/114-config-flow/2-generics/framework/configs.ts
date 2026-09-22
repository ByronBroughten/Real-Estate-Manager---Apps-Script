// PROTOTYPE #114, throwaway. Variant 2: every tier carries C, and the values ride the instances.
export type ConfigSetBase = {
  sheetConfigs: { readonly [sheet: string]: { readonly sheetGid: number } };
  columnConfigs: {
    readonly [sheet: string]: {
      readonly [col: string]: { readonly header: string; readonly valueName: string };
    };
  };
};
type ValueOf<VN> = VN extends "number" ? number : VN extends "checkbox" ? boolean : string;

export type SheetName<C extends ConfigSetBase> = keyof C["columnConfigs"] & string;
export type ColumnName<C extends ConfigSetBase, SN extends SheetName<C>> = SN extends SheetName<C>
  ? keyof C["columnConfigs"][SN] & string
  : never;
export type ColumnValue<C extends ConfigSetBase, SN extends SheetName<C>, CN extends ColumnName<C, SN>> =
  SN extends SheetName<C>
    ? CN extends keyof C["columnConfigs"][SN]
      ? ValueOf<C["columnConfigs"][SN][CN]["valueName" & keyof C["columnConfigs"][SN][CN]]>
      : never
    : never;
