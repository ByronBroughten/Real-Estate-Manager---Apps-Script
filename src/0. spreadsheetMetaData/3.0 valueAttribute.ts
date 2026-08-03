import type {
  GoogleCellValue,
  GoogleEffectiveValue,
} from "../2. AppsScriptRaw/Types/AppsScriptTypes";
import { valS } from "../utils/validation";

export type ValueAttributesBase<V extends unknown = unknown> = {
  type: V;
  makeDefault: MakeDefaultValueBase<V>;
  defaultValidate: ValidateValueBase<V>;
  extractCellValue: ExtractCellValue<V>;
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

type ExtractCellValue<V extends unknown> = (gsCellValue: GoogleCellValue) => V;
type MakeDefaultValueBase<V extends unknown> = () => V;
type ValidateValueBase<V extends unknown> = (value: unknown) => V;

export function va<V extends unknown>(props: {
  type: V;
  makeDefault: MakeDefaultValueBase<V>;
  defaultValidate: ValidateValueBase<V>;
  extractCellValue: ExtractCellValue<V>;
}): ValueAttributesBase<V> {
  return props;
}
