import type {
  FloorColumnType,
  FloorSeedColumn,
  FloorSeedLookup,
} from "./configSheetFloorSeed";
import type { SheetNameSimple } from "./sheetConfigsTypes";
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

export function makeStructuredConfig<S, const T extends S>(
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
    if (!idPrefix) {
      throw new Error(`Sheet "${label}" has no ID prefix.`);
    }
    const existing = labelByPrefix.get(idPrefix);
    if (existing !== undefined) {
      throw new Error(
        `Sheets "${existing}" and "${label}" share ID prefix "${idPrefix}".`,
      );
    }
    labelByPrefix.set(idPrefix, label);
  });
}

const vowels = new Set(["a", "e", "i", "o", "u"]);

export function makeIdPrefixFromTitle(
  title: string,
  prefixesInUse: ReadonlySet<string>,
): string {
  const { base, remainingConsonants } = idPrefixBaseAndRemaining(title);
  if (!prefixesInUse.has(base)) return base;
  let candidate = base;
  for (const letter of remainingConsonants) {
    candidate += letter;
    if (!prefixesInUse.has(candidate)) return candidate;
  }
  for (let n = 2; ; n++) {
    const numbered = `${base}${n}`;
    if (!prefixesInUse.has(numbered)) return numbered;
  }
}

function idPrefixBaseAndRemaining(title: string): {
  base: string;
  remainingConsonants: string;
} {
  const titleWords = title
    .toLowerCase()
    .replace(/[^a-z ]/g, "")
    .split(" ")
    .filter((word) => word !== "");
  const lastWord = titleWords.at(-1);
  if (lastWord === undefined) return { base: "s", remainingConsonants: "" };
  const initials = titleWords.map((word) => word.charAt(0)).join("");
  const afterFirst = [...lastWord.slice(1)]
    .filter((letter) => !vowels.has(letter))
    .join("");
  if (initials.length >= 3) {
    return { base: initials, remainingConsonants: afterFirst };
  }
  const base = (initials + afterFirst).slice(0, 3);
  return {
    base,
    remainingConsonants: afterFirst.slice(base.length - initials.length),
  };
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
  floorSeed?: FloorSeedLookup,
): T {
  validateIdPrefixesAreUnique(
    Object.entries(sheetConfigs).map(([label, config]) => ({
      label,
      idPrefix: config.idPrefix,
    })),
  );
  if (floorSeed) validateFloorTabEntries(sheetConfigs, floorSeed);
  return sheetConfigs;
}

export function validateFloorTabEntries(
  sheetConfigs: SheetConfigsBase,
  floorSeed: FloorSeedLookup,
): void {
  const missing = floorSeed.tabNames.find(
    (sheetName) => !Object.hasOwn(sheetConfigs, sheetName),
  );
  if (missing === undefined) return;
  throw new Error(
    `Floor tab "${missing}" has no floor entry; Let api access may be unticked on its Sheet Config row.`,
  );
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

// The seeded form checks a regen's configs, which needn't match the last generated sheet list yet.
export function makeColumnConfigs<T extends ColumnConfigsBase>(
  columnConfigs: T,
): T;
export function makeColumnConfigs<T extends ColumnConfigsGeneric>(
  columnConfigs: T,
  floorSeed: FloorSeedLookup,
): T;
export function makeColumnConfigs<T extends ColumnConfigsGeneric>(
  columnConfigs: T,
  floorSeed?: FloorSeedLookup,
): T {
  if (floorSeed) validateFloorColumnEntries(columnConfigs, floorSeed);
  return makeStructuredConfig({} as ColumnConfigsGeneric, columnConfigs);
}

const floorColumnTypeValueNames: Record<FloorColumnType, ValueName> = {
  TEXT: "string",
  DOUBLE: "number",
  BOOLEAN: "checkbox",
};

export function validateFloorColumnEntries(
  columnConfigs: ColumnConfigsGeneric,
  floorSeed: FloorSeedLookup,
): void {
  const mismatches = floorSeed.tabNames.flatMap((sheetName) => {
    const matched = new Set<FloorSeedColumn>();
    const entryMismatches = Object.entries(
      columnConfigs[sheetName] ?? {},
    ).flatMap(([columnName, column]) => {
      const seedColumn = floorSeed.columnById(sheetName, column.columnId);
      if (seedColumn === undefined) return [];
      matched.add(seedColumn);
      const label = `Floor column "${columnName}" (column ID "${column.columnId}") on "${sheetName}"`;
      return floorColumnMismatches(label, column, seedColumn);
    });
    const missing = floorSeed
      .columns(sheetName)
      .filter((seedColumn) => !matched.has(seedColumn))
      .map(
        ({ header }) =>
          `Floor column "${header}" on "${sheetName}" has no floor entry.`,
      );
    return [...entryMismatches, ...missing];
  });
  if (mismatches.length === 0) return;
  throw new Error(
    `The generated configs differ from the floor seed. ${mismatches.join(" ")}`,
  );
}

function floorColumnMismatches(
  label: string,
  column: ColumnConfigStored,
  seedColumn: FloorSeedColumn,
): string[] {
  const mismatches: string[] = [];
  if (column.header !== seedColumn.header) {
    mismatches.push(
      `${label} has header "${column.header}" where the floor seed has "${seedColumn.header}".`,
    );
  }
  const seedValueName = floorColumnTypeValueNames[seedColumn.columnType];
  if (column.valueName !== seedValueName) {
    mismatches.push(
      `${label} has valueName "${column.valueName}" where the floor seed's column type ${seedColumn.columnType} implies "${seedValueName}".`,
    );
  }
  if (column.emptyValueAllowed !== seedColumn.emptyValueAllowed) {
    mismatches.push(
      `${label} has emptyValueAllowed ${column.emptyValueAllowed} where the floor seed has ${seedColumn.emptyValueAllowed}.`,
    );
  }
  return mismatches;
}
