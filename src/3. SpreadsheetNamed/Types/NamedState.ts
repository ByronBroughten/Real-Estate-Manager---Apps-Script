import type { SheetName } from "../../0. spreadsheetMetaData/4.0 tableAttributes";
import type { ColumnName } from "../../0. spreadsheetMetaData/5. allColumnAttributes";
import type { GridRangeProps } from "../../2. AppsScriptRaw/Types/RawState";
import { Arr } from "../../utils/Arr";
import type { StrictOmit } from "../../utils/Obj";
import type { SheetNamed } from "../SheetNamed";

export type RowIdsToIndexes = Record<string, number>;
export type SheetRowIdsToIndexes = { [SN in SheetName]?: RowIdsToIndexes };
export type SpreadsheetNamedState = {
  gridRangeFetchProps: GridRangeProps[];
  sheetRowIdsToIndexes: SheetRowIdsToIndexes;
};

type SheetColumnNames<SN extends SheetName> = {
  [S in SN]?: ColumnSpecifierNamed<SN>;
};

export type FetchSpecifierObjNamed<SN extends SheetName = SheetName> = {
  all: {
    rowSpecifier: RowSpecifier;
    sheetColumnMode: "all";
  };
  allColumns: {
    rowSpecifier: RowSpecifier;
    sheetColumnMode: "allColumns";
    sheetNames: SN | SN[];
  };
  specific: {
    rowSpecifier: RowSpecifier;
    sheetColumnMode: "specific";
    sheetColumnNames: SheetColumnNames<SN>;
  };
};

type FetchColumnsSpecifierObjNamed<SN extends SheetName = SheetName> = {
  [S in keyof FetchSpecifierObjNamed<SN>]: StrictOmit<
    FetchSpecifierObjNamed<SN>[S],
    "rowSpecifier"
  >;
};

export type FetchColumnSpecifierNamed<SN extends SheetName> =
  FetchColumnsSpecifierObjNamed<SN>[ColumnMode];

type ColumnMode = keyof FetchSpecifierObjNamed;

export type FetchPropsNamed<SN extends SheetName> =
  FetchSpecifierObjNamed<SN>[ColumnMode];

export type SheetColumnNamesStandard<SN extends SheetName> = {
  [S in SN]?: ColumnName<SN>[];
};

export type FetchPropsStandardNamed<SN extends SheetName = SheetName> = {
  rowSpecifier: RowSpecifier;
  sheetColumnNames: SheetColumnNamesStandard<SN>;
};

type RowSpecifier = RowSpecifierName | RowSpecifierName[];
export type RowSpecifierBySchemaName =
  (typeof rowSpecifierBySchemaNames)[number];

export const rowSpecifierNames = [
  "all",
  "activeRows",
  "data",
  "topDatum",
  "actions",
  "columnIds",
  "headers",
] as const;
export type RowSpecifierName = (typeof rowSpecifierNames)[number];
export function isRowName(value: unknown): value is RowSpecifierName {
  return (
    typeof value === "string" &&
    rowSpecifierNames.includes(value as RowSpecifierName)
  );
}

const rowSpecifierBySchemaNames = Arr.excludeStrict(
  rowSpecifierNames,
  "activeRows" as "activeRows",
);
export function isRowSpecifierBySchemaName(
  value: unknown,
): value is RowSpecifierName {
  return (
    typeof value === "string" &&
    rowSpecifierNames.includes(value as RowSpecifierName)
  );
}

export type ColumnSpecifierNamed<TN extends SheetName> =
  | ColumnName<TN>
  | ColumnName<TN>[]
  | "allColumns";

export type NamedSheets<TN extends SheetName> = {
  [T in TN]: SheetNamed<T>;
};
