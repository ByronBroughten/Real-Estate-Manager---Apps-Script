import { makeStructuredConfig } from "../00_base/base";
import type { SheetNameSimple } from "./sheetConfigsTypes";
import type { Value, ValueName } from "./valueSchemas";

export interface ColumnConfigLiteral {
  columnId: string;
  header: string;
  isFormula: boolean;
  emptyAllowed: boolean;
}
export interface ColumnConfig<
  VN extends ValueName = ValueName,
> extends ColumnConfigLiteral {
  valueName: VN;
  customDefaultValue: Value<VN> | null;
}
function makeColumnConfig<VN extends ValueName>(
  columnId: string,
  valueName: VN,
  header: string,
  isFormula: boolean,
  emptyAllowed: boolean = false,
  customDefaultValue: Value<VN> | null = null,
): ColumnConfig<VN> {
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

type TableColumnConfigs = Record<string, ColumnConfig>;
type ColumnConfigsBase = Record<SheetNameSimple, TableColumnConfigs>;

export function makeColumnConfigs<T extends ColumnConfigsBase>(
  columnConfigs: T,
): T {
  return makeStructuredConfig({} as ColumnConfigsBase, columnConfigs);
}
