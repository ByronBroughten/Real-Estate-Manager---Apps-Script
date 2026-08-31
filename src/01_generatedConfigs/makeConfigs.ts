import type { SheetNameSimple } from "./sheetConfigsTypes";
import type { Value, ValueName } from "./valueSchemas";

export const importMakeSheetConfigsLine = `import { makeSheetConfigs } from "./makeConfigs";`;

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
