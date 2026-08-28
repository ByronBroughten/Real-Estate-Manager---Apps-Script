import { makeStructuredConfig } from "../00_base/base";
import type { SheetNameSimple } from "./sheetConfigsTypes";
import type { Value, ValueName } from "./valueSchemas";

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
// The full record: everything in ColumnConfigStored, plus columnName, which
// isn't stored on the literal entry itself (it's the entry's key in
// columnConfigs.ts) but is available as a trait via getColumnTraitByName /
// getColumnTraitByIndex regardless of which way the record was looked up.
export interface ColumnConfig<VN extends ValueName = ValueName>
  extends ColumnConfigStored<VN> {
  columnName: string;
}
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

export type TableColumnConfigs = Record<string, ColumnConfigStored>;
export type ColumnConfigsBase = Record<SheetNameSimple, TableColumnConfigs>;

export function makeColumnConfigs<T extends ColumnConfigsBase>(
  columnConfigs: T,
): T {
  return makeStructuredConfig({} as ColumnConfigsBase, columnConfigs);
}
