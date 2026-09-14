import type { SheetNameSimple } from "./sheetConfigsTypes";
import type { Value, ValueName } from "./valueSchemas";

export function makeImportLine(
  configMagerName:
    | "makeSheetConfigs"
    | "makeColumnConfigs"
    | "makeValueConfigs"
    | "makeSpreadsheetConfig",
) {
  return `import { ${configMagerName} } from "./makeConfigs";`;
}

export function makeStructuredConfig<S extends unknown, const T extends S>(
  _structure: S,
  t: T,
): T {
  return t;
}

export interface UniformRowLayoutIndexes {
  columnIdRowIdxBase0: number;
  columnGroupHeadingRowIndexBase0: number;
  actionRowIndexBase0: number;
  tableHeaderRowIndexBase0: number;
}

export type UniformRowLayoutKey = keyof UniformRowLayoutIndexes;

const uniformRowLayoutKeys: readonly UniformRowLayoutKey[] = [
  "columnIdRowIdxBase0",
  "columnGroupHeadingRowIndexBase0",
  "actionRowIndexBase0",
  "tableHeaderRowIndexBase0",
];

export const uniformRowLayoutLabels: Record<UniformRowLayoutKey, string> = {
  columnIdRowIdxBase0: 'Spreadsheet Config column "Column ID row index base 1"',
  columnGroupHeadingRowIndexBase0:
    'Spreadsheet Config column "Column group heading row index base 1"',
  actionRowIndexBase0: 'Spreadsheet Config column "Action row index base 1"',
  tableHeaderRowIndexBase0:
    'Spreadsheet Config column "Table header row index base 1"',
};

export function validateSpreadsheetLayoutIndexes(
  config: UniformRowLayoutIndexes,
  labels: Record<UniformRowLayoutKey, string> = uniformRowLayoutLabels,
): void {
  const firstDataRowIndex = config.tableHeaderRowIndexBase0 + 1;
  const nameByIndex = new Map<number, string>();
  uniformRowLayoutKeys.forEach((key) => {
    const index = config[key];
    const label = labels[key];
    if (typeof index !== "number" || !Number.isInteger(index) || index < 0) {
      throw new Error(
        `${label} must be an integer ≥ 0, got ${JSON.stringify(index)}.`,
      );
    }
    const existing = nameByIndex.get(index);
    if (existing !== undefined) {
      throw new Error(`${existing} and ${label} must not share a row.`);
    }
    if (index === firstDataRowIndex) {
      throw new Error(`${label} must not land on the first data row.`);
    }
    nameByIndex.set(index, label);
  });
}

export interface IdPrefixLabel {
  label: string;
  idPrefix: string;
}

export function validateIdPrefixesAreUnique(
  idPrefixLabels: ReadonlyArray<IdPrefixLabel>,
): void {
  const labelByPrefix = new Map<string, string>();
  idPrefixLabels.forEach(({ label, idPrefix }) => {
    if (!idPrefix) return;
    const existing = labelByPrefix.get(idPrefix);
    if (existing !== undefined) {
      throw new Error(
        `Sheets "${existing}" and "${label}" share ID prefix "${idPrefix}".`,
      );
    }
    labelByPrefix.set(idPrefix, label);
  });
}

export function makeSpreadsheetConfig<
  T extends UniformRowLayoutIndexes & Record<string, string | number>,
>(config: T): T {
  validateSpreadsheetLayoutIndexes(config);
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
  validateIdPrefixesAreUnique(
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

export interface ColumnConfigLiteral {
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

export type TableColumnConfigs = Record<string, ColumnConfigStored>;
export type ColumnConfigsBase = Record<SheetNameSimple, TableColumnConfigs>;
export type ColumnConfigsGeneric = Record<string, TableColumnConfigs>;

export function makeColumnConfigs<T extends ColumnConfigsBase>(
  columnConfigs: T,
): T {
  return makeStructuredConfig({} as ColumnConfigsBase, columnConfigs);
}
