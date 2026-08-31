import type { SheetNameSimple } from "./sheetConfigsTypes";
import type { Value, ValueName } from "./valueSchemas";

export const makeConfigsDirRelativeToConfigs = "./makeConfigs";

export function makeStructuredConfig<const S extends unknown, T extends S>(
  _structure: S,
  t: T,
): T {
  return t;
}

export function makeSpreadsheetConfig<
  T extends Record<string, string | number>,
>(config: T): T {
  return config;
}

export interface SheetConfigStored<H extends boolean = boolean> {
  sheetGid: number;
  hasIdColumn: H;
  idPrefix: string;
}
export type SheetConfigsBase = Record<string, SheetConfigStored>;
export function makeSheetConfigs<T extends SheetConfigsBase>(
  sheetConfigs: T,
): T {
  return sheetConfigs;
}
// TODO: delete makeSheetConfig
export function makeSheetConfig<H extends boolean = false>(
  sheetGid: number,
  idPrefix: string,
  hasIdColumn: H = false as H,
): SheetConfigStored<H> {
  return {
    sheetGid,
    idPrefix,
    hasIdColumn,
  };
}
export const msc = makeSheetConfig;
// TODO: copy and paste from updated sheetConfigs
export const baseSheetConfigs = makeSheetConfigs({
  spreadsheetConfig: msc(1967106628, "vrb"),
  sheetConfig: msc(210603630, "stm"),
  columnConfig: msc(2034522667, "scm"),
  valueConfig: msc(2119236084, "vcf"),
  spreadsheetControls: msc(1971630928, "sct"),
  test: msc(2089200354, "tst", true),
});

export type ValueConfigsBase = Record<string, readonly string[]>;
export function makeValueConfigs<T extends ValueConfigsBase>(
  valueConfigs: T,
): T {
  return makeStructuredConfig(
    {} as Record<string, readonly string[]>,
    valueConfigs,
  );
}

export interface ColumnConfigLiteral {
  columnId: string;
  header: string;
  isFormula: boolean;
  emptyAllowed: boolean;
}
export interface ColumnConfigStored<
  VN extends ValueName = ValueName,
> extends ColumnConfigLiteral {
  valueName: VN;
  customDefaultValue: Value<VN> | null;
}

export type TableColumnConfigs = Record<string, ColumnConfigStored>;
export type ColumnConfigsBase = Record<SheetNameSimple, TableColumnConfigs>;
export type ColumnConfigsGeneric = Record<string, TableColumnConfigs>;

export function makeColumnConfigs<T extends ColumnConfigsBase>(
  columnConfigs: T,
): T {
  return makeStructuredConfig({} as ColumnConfigsBase, columnConfigs);
}

// TODO: delete makeColumnConfig
function makeColumnConfig<VN extends ValueName>(
  columnId: string,
  valueName: VN,
  header: string,
  isFormula: boolean,
  emptyAllowed: boolean = false,
  customDefaultValue: Value<VN> | null = null,
): ColumnConfigStored<VN> {
  return {
    columnId,
    valueName,
    header,
    isFormula,
    emptyAllowed,
    customDefaultValue,
  };
}
export const mcc = makeColumnConfig;
