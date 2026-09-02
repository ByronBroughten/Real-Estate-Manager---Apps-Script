import { nameDelimiter, type NameDelimiter } from "../00_base/base";
import { Obj, type KeyedMap } from "../utils/Obj";
import type { StemWithSuffix } from "../utils/Str";
import { Val } from "../utils/Val";
import { columnConfigs } from "./columnConfigs";
import type { ColumnConfigStored } from "./makeConfigs";
import {
  configSheetNames,
  getSheetTraitByName,
  type SheetNameSimple,
} from "./sheetConfigsTypes";
import type { SpreadsheetConfig } from "./spreadsheetConfigTypes";
import { type Value, type ValueName, type ValueSchema } from "./valueSchemas";

export type ColumnConfigs = typeof columnConfigs;

export type ColumnName<SN extends SheetNameSimple = SheetNameSimple> =
  SN extends SheetNameSimple ? keyof ColumnConfigs[SN] : never;

// Distributes over SN; indexing a union of sheets by a union of column names collapses to never.
export type ColumnValueName<
  SN extends SheetNameSimple,
  CN extends ColumnName<SN>,
> = SN extends SheetNameSimple
  ? CN extends keyof ColumnConfigs[SN]
    ? ColumnConfigs[SN][CN]["valueName" & keyof ColumnConfigs[SN][CN]]
    : never
  : never;

export type ColumnIsFormula<
  SN extends SheetNameSimple,
  CN extends ColumnName<SN>,
> = SN extends SheetNameSimple
  ? CN extends keyof ColumnConfigs[SN]
    ? ColumnConfigs[SN][CN]["isFormula" & keyof ColumnConfigs[SN][CN]]
    : never
  : never;

export type ColumnNameFiltered<
  SN extends SheetNameSimple,
  VN extends ValueName = ValueName,
  IF extends boolean = boolean,
> = SN extends SheetNameSimple
  ? {
      [CN in ColumnName<SN>]: ColumnValueName<SN, CN> extends VN
        ? ColumnIsFormula<SN, CN> extends IF
          ? CN
          : never
        : never;
    }[ColumnName<SN>] &
      ColumnName<SN>
  : never;

export interface ColumnConfig<
  VN extends ValueName = ValueName,
> extends ColumnConfigStored<VN> {
  columnName: string;
}
export type ColumnConfigAt<
  SN extends SheetNameSimple,
  CN extends ColumnName<SN>,
> = ColumnConfig<ColumnValueName<SN, CN>>;

export type ColumnValueSchema<
  SN extends SheetNameSimple,
  CN extends ColumnName<SN>,
> = ValueSchema<ColumnValueName<SN, CN>>;

export type ColumnValue<
  SN extends SheetNameSimple,
  CN extends ColumnName<SN>,
> = Value<ColumnValueName<SN, CN>>;

export type SheetDataValues<
  SN extends SheetNameSimple,
  VNS extends ColumnName<SN> = ColumnName<SN>,
> = {
  [CN in VNS]: ColumnValue<SN, CN>;
};

export function getSheetColumnNames<SN extends SheetNameSimple>(
  sheetName: SN,
): ColumnName<SN>[] {
  return Obj.keys(columnConfigs[sheetName]) as unknown as ColumnName<SN>[];
}

// columnConfig isn't actually very unique. The only unique
export function getColumnTraitByName<
  TN extends SheetNameSimple,
  CN extends ColumnName<TN>,
  K extends keyof ColumnConfigAt<TN, CN>,
>(sheetName: TN, columnName: CN, key: K): ColumnConfigAt<TN, CN>[K] {
  if (key === "columnName") {
    return columnName as ColumnConfigAt<TN, CN>[K];
  }
  return (columnConfigs[sheetName][columnName] as ColumnConfigAt<TN, CN>)[key];
}

export type TableColumnConfigsIndexed = KeyedMap<
  Record<string, ColumnConfigStored>,
  "columnId",
  "columnName"
>;

type ColumnConfigsIndexed = Map<number, TableColumnConfigsIndexed>;
function makeColumnConfigsByGidAndColId(): ColumnConfigsIndexed {
  return configSheetNames.reduce((attrs, sheetName) => {
    const sheetGid = getSheetTraitByName(sheetName, "sheetGid");
    attrs.set(
      sheetGid,
      Obj.toKeyedMap(columnConfigs[sheetName], "columnId", "columnName"),
    );
    return attrs;
  }, new Map() as ColumnConfigsIndexed);
}

const columnConfigsIndexed = makeColumnConfigsByGidAndColId();

export function getColumnTraitByIndex<K extends keyof ColumnConfig>(
  sheetId: number,
  columnId: string,
  key: K,
): ColumnConfig[K] {
  const colTraits = Val.assert(
    columnConfigsIndexed.get(sheetId)?.get(columnId),
    `column attributes for sheetId=${sheetId}, columnId=${columnId}`,
  );
  return colTraits[key];
}
export function getSheetColumnIds(sheetGid: number): MapIterator<string> {
  return Val.assert(
    columnConfigsIndexed.get(sheetGid),
    `column attributes for sheetId=${sheetGid}`,
  ).keys();
}

export type MakeColumnFullName<
  SN extends SheetNameSimple,
  CN extends ColumnName<SN>,
> = `${SN}${NameDelimiter}${CN & string}`;

const columnConfigsFlat = Obj.flattenTwoLevels(columnConfigs, {
  keyDelimiter: nameDelimiter,
  outerKeyName: "sheetName",
  innerKeyName: "columnName",
});
type ColumnConfigsFlat = typeof columnConfigsFlat;
type ColumnFullNameAll = keyof ColumnConfigsFlat & string;

// Absolute addressing: one correlated key, so a filtered subset of columns is expressible.
export type ColumnFullName<
  VN extends ValueName = ValueName,
  IF extends boolean = boolean,
> = {
  [FN in ColumnFullNameAll]: ColumnConfigsFlat[FN]["valueName"] extends VN
    ? ColumnConfigsFlat[FN]["isFormula"] extends IF
      ? FN
      : never
    : never;
}[ColumnFullNameAll];

export type SheetNameOf<FN extends ColumnFullName> =
  ColumnConfigsFlat[FN]["sheetName"];
export type ColumnNameOf<FN extends ColumnFullName> =
  ColumnConfigsFlat[FN]["columnName"] & ColumnName<SheetNameOf<FN>>;
export type ValueNameOf<FN extends ColumnFullName> =
  ColumnConfigsFlat[FN]["valueName"];
export type ValueOf<FN extends ColumnFullName> = Value<ValueNameOf<FN>>;

// A stem counts only when all three status columns exist, so a handler can't be
// assembled from two unrelated endpoints' columns.
type SheetStemsWithSuffix<
  SN extends SheetNameSimple,
  Suffix extends string,
> = StemWithSuffix<ColumnName<SN> & string, Suffix>;

export type RunnerStem<SN extends SheetNameSimple> = Extract<
  Extract<
    SheetStemsWithSuffix<SN, SpreadsheetConfig["runnerEndpointSuffix"]>,
    SheetStemsWithSuffix<SN, SpreadsheetConfig["runSucceededEndpointSuffix"]>
  >,
  SheetStemsWithSuffix<SN, SpreadsheetConfig["errorMessageEndpointSuffix"]>
>;
