import type {
  GoogleCellValue,
  GoogleEffectiveValue,
  UserEnteredValue,
} from "../2. AppsScriptRaw/Types/AppsScriptTypes";
import { valS } from "../utils/validation";

export type ValueSchemaBase<V extends unknown = unknown> = {
  type: V;
  makeDefault: MakeDefaultValueBase<V>;
  strictValidate: ValidateValueBase<V>;
  extractCellValue: ExtractCellValue<V>;
  makeUserEnteredValue: MakeUserEnteredValue<V>;
};

export function extractCellValue<
  K extends keyof GoogleEffectiveValue,
  T extends unknown = undefined,
>(
  cellValue: GoogleCellValue | undefined,
  key: K,
  transformer?: (value: GoogleEffectiveValue[K]) => T,
): T extends undefined ? GoogleEffectiveValue[K] | "" : T | "" {
  if (cellValue === undefined) {
    return "" as T extends undefined ? GoogleEffectiveValue[K] | "" : T;
  }
  const value = valS.assertDefined(cellValue.effectiveValue[key], key);
  if (transformer) {
    return transformer(value) as T extends undefined
      ? GoogleEffectiveValue[K] | ""
      : T;
  } else {
    return value as T extends undefined ? GoogleEffectiveValue[K] | "" : T;
  }
}

type MakeUserEnteredValue<V extends unknown> = (value: V) => UserEnteredValue;
type ExtractCellValue<V extends unknown> = (gsCellValue: GoogleCellValue) => V;
type MakeDefaultValueBase<V extends unknown> = () => V;
type ValidateValueBase<V extends unknown> = (value: unknown) => V;

export function vsc<V extends unknown>(props: {
  type: V;
  makeDefault: MakeDefaultValueBase<V>;
  strictValidate: ValidateValueBase<V>;
  extractCellValue: ExtractCellValue<V>;
  makeUserEnteredValue: MakeUserEnteredValue<V>;
}): ValueSchemaBase<V> {
  return props;
}
