import { nameDelimiter, type NameDelimiter } from "../00_base/base";
import { Obj, type KeyedMap } from "../utils/Obj";
import { valS } from "../utils/validation";
import type { ColumnConfig } from "./columnConfigBuilder";
import { columnConfigs } from "./columnConfigs";
import {
  configSheetNames,
  getSheetTraitByName,
  type SheetNameSimple,
} from "./sheetConfigsTypes";
import { type Value, type ValueName, type ValueSchema } from "./valueSchemas";

export type ColumnConfigs = typeof columnConfigs;

export type ColumnName<SN extends SheetNameSimple = SheetNameSimple> =
  keyof ColumnConfigs[SN];

export type ColumnValueName<
  SN extends SheetNameSimple,
  CN extends ColumnName<SN>,
> = ColumnConfigs[SN][CN]["valueName" & keyof ColumnConfigs[SN][CN]];

export type ColumnConfigAt<
  SN extends SheetNameSimple,
  CN extends ColumnName<SN>,
> = ColumnConfig<ColumnValueName<SN, CN> & ValueName>;

export type ColumnValueSchema<
  SN extends SheetNameSimple,
  CN extends ColumnName<SN>,
> = ValueSchema<ColumnValueName<SN, CN> & ValueName>;

export type ColumnValue<
  SN extends SheetNameSimple,
  CN extends ColumnName<SN>,
> = Value<ColumnValueName<SN, CN> & ValueName>;

export type SheetDataValues<
  SN extends SheetNameSimple,
  VNS extends ColumnName<SN> = ColumnName<SN>,
> = {
  [CN in VNS]: ColumnValue<SN, CN>;
};

export function getSheetColumnNames<SN extends SheetNameSimple>(
  sheetName: SN,
): ColumnName<SN>[] {
  return Obj.keys(columnConfigs[sheetName]);
}

// columnConfig isn't actually very unique. The only unique
export function getColumnTraitByName<
  TN extends SheetNameSimple,
  CN extends ColumnName<TN>,
  K extends keyof ColumnConfigAt<TN, CN>,
>(sheetName: TN, columnName: CN, key: K): ColumnConfigAt<TN, CN>[K] {
  return (columnConfigs[sheetName][columnName] as ColumnConfigAt<TN, CN>)[key];
}

export type TableColumnConfigsByColId = KeyedMap<
  Record<string, ColumnConfig>,
  "columnId",
  "columnName"
>;

type ColumnConfigsByGidAndColId = Map<number, TableColumnConfigsByColId>;
function makeColumnConfigsByGidAndColId(): ColumnConfigsByGidAndColId {
  return configSheetNames.reduce((attrs, sheetName) => {
    const sheetGid = getSheetTraitByName(sheetName, "sheetGid");
    attrs.set(
      sheetGid,
      Obj.toKeyedMap(columnConfigs[sheetName], "columnId", "columnName"),
    );
    return attrs;
  }, new Map() as ColumnConfigsByGidAndColId);
}

const columnConfigsByGidAndColId = makeColumnConfigsByGidAndColId();

export type ColumnTraitRaw =
  TableColumnConfigsByColId extends Map<any, infer V> ? V : never;
export type ColumnTraitRawKey = keyof ColumnTraitRaw;
export function getColumnTraitByIndex<K extends ColumnTraitRawKey>(
  sheetId: number,
  columnId: string,
  key: K,
): ColumnTraitRaw[K] {
  const colTraits = valS.assert(
    columnConfigsByGidAndColId.get(sheetId)?.get(columnId),
    `column attributes for sheetId=${sheetId}, columnId=${columnId}`,
  );
  return colTraits[key];
}
export function getSheetColumnIds(sheetGid: number): MapIterator<string> {
  return valS
    .assert(
      columnConfigsByGidAndColId.get(sheetGid),
      `column attributes for sheetId=${sheetGid}`,
    )
    .keys();
}

const columnConfigsFlat = Obj.flattenTwoLevels(columnConfigs, nameDelimiter);
type ColumnConfigsFlat = typeof columnConfigsFlat;
export type ColumnFullNameSimple = keyof ColumnConfigsFlat;

export type ColumnFullName<
  SN extends SheetNameSimple,
  CN extends ColumnName<SN>,
> = `${SN}${NameDelimiter}${CN & string}`;
