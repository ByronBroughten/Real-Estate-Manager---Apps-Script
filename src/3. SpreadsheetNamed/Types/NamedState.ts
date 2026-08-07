import type { SheetName } from "../../0. spreadsheetMetaData/4.0 tableAttributes";
import type { ColumnName } from "../../0. spreadsheetMetaData/5. allColumnAttributes";
import type { FetchRowsRawProps } from "../../2. AppsScriptRaw/Types/RawState";
import { Arr } from "../../utils/Arr";
import type { SheetNamed } from "../SheetNamed";

export type RowIdsToIndexes = Record<string, number>;
export type SheetRowIdsToIndexes = { [SN in SheetName]?: RowIdsToIndexes };
export type SpreadsheetNamedState = {
  fetchRowsRawProps: FetchRowsRawProps[];
  sheetRowIdsToIndexes: SheetRowIdsToIndexes;
};

export type FetchRowsNamedProps<TN extends SheetName = SheetName> = {
  rowSpecifier: RowSpecifier;
  sheets: {
    [T in TN]?: ColumnSpecifierNamed<TN>;
  };
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
] as const;
export type RowSpecifierName = (typeof rowSpecifierNames)[number];
export function isRowName(value: unknown): value is RowSpecifierName {
  return (
    typeof value === "string" &&
    rowSpecifierNames.includes(value as RowSpecifierName)
  );
}

const rowSpecifierBySchemaNames = Arr.extractStrict(
  rowSpecifierNames,
  "activeRows",
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
  | ColumnName<TN>[]
  | "allColumns";

export type NamedSheets<TN extends SheetName> = {
  [T in TN]: SheetNamed<T>;
};
