import { idPrefixes } from "./idPrefixes";
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
  makeConfigsImport: string,
): string {
  return `import { ${configMagerName} } from ${JSON.stringify(makeConfigsImport)};`;
}

function makeStructuredConfig<S, const T extends S>(_structure: S, t: T): T {
  return t;
}

export type SpreadsheetConfigBase = UniformRowLayoutIndexes &
  Record<string, string | number>;
export function makeSpreadsheetConfig<T extends SpreadsheetConfigBase>(
  config: T,
): T {
  uniformRowLayout.validate(config);
  return config;
}

export interface SheetConfigStored<H extends boolean = boolean> {
  sheetGid: number;
  hasIdColumn: H;
  hasNameColumn: boolean;
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
export type ColumnConfigsGeneric = Record<string, TableColumnConfigs>;

interface ColumnConfigLiteralStored<
  VN extends string,
> extends ColumnConfigLiteral {
  valueName: VN;
  customDefaultValue: unknown;
}
// Names no Register-derived type, so the generated literal can fill Register without a cycle.
export type ColumnConfigsBase<VN extends string = string> = Record<
  string,
  Record<string, ColumnConfigLiteralStored<VN>>
>;

// VN keeps each valueName a literal instead of widening it to string.
export function makeColumnConfigs<
  VN extends string,
  T extends ColumnConfigsBase<VN>,
>(columnConfigs: T): T {
  return makeStructuredConfig({} as ColumnConfigsBase, columnConfigs);
}
