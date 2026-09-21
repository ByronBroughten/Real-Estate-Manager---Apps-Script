import { idPrefixes } from "./idPrefixes";
import type { SheetNameSimple } from "./sheetConfigsTypes";
import {
  uniformRowLayout,
  type UniformRowLayoutIndexes,
} from "./uniformRowLayout";
import type { Value, ValueName } from "./valueSchemas";

export function makeImportLine(
  configMagerName:
    | "makeSheetConfigs"
    | "makeColumnConfigs"
    | "makeValueConfigs"
    | "makeSpreadsheetConfig",
) {
  return `import { ${configMagerName} } from "../makeConfigs";`;
}

function makeStructuredConfig<S, const T extends S>(_structure: S, t: T): T {
  return t;
}

export function makeSpreadsheetConfig<
  T extends UniformRowLayoutIndexes & Record<string, string | number>,
>(config: T): T {
  uniformRowLayout.validate(config);
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
  idPrefixes.assertUnique(
    Object.entries(sheetConfigs).map(([label, config]) => ({
      label,
      idPrefix: config.idPrefix,
    })),
  );
  return sheetConfigs;
}

export type ValueConfigsBase = Record<string, readonly string[]>;
export function makeValueConfigs<const T extends ValueConfigsBase>(
  valueConfigs: T,
): T {
  return makeStructuredConfig(
    {} as Record<string, readonly string[]>,
    valueConfigs,
  );
}

interface ColumnConfigLiteral {
  columnId: string;
  header: string;
  isFormula: boolean;
  emptyValueAllowed: boolean;
}
export interface ColumnConfigStored<
  VN extends ValueName = ValueName,
> extends ColumnConfigLiteral {
  valueName: VN;
  customDefaultValue: Value<VN> | null;
}

type TableColumnConfigs = Record<string, ColumnConfigStored>;
type ColumnConfigsBase = Record<SheetNameSimple, TableColumnConfigs>;
export type ColumnConfigsGeneric = Record<string, TableColumnConfigs>;

export function makeColumnConfigs<T extends ColumnConfigsBase>(
  columnConfigs: T,
): T {
  return makeStructuredConfig({} as ColumnConfigsBase, columnConfigs);
}
