import type { CellValue, CellValueName } from "../00_base/base";
import {
  baseValueNames,
  baseValueSchemas,
  type BaseValues,
  type BlankOf,
} from "../00_base/baseValueSchemas";
import type { ValueSchemaBase, ValueSchemaKey } from "../00_base/valueSchema";
import type { Merge } from "../utils/Obj/merge";
import { valueConfigNames, type ValueConfigValues } from "./valueConfigsTypes";
import { makeSchemasFromValueConfig } from "./valueConfigSchemas";

const valueNames = [...baseValueNames, ...valueConfigNames] as const;
type ValueNameSimple = (typeof valueNames)[number];

type AllValues = Merge<BaseValues, ValueConfigValues>;
type AllValuesOrEmpty = {
  [VN in ValueNameSimple]: AllValues[VN] | BlankOf<VN>;
};

export type ValueSchemas = {
  [VN in ValueNameSimple]: ValueSchemaBase<AllValuesOrEmpty[VN]>;
};
export type ValueName<V extends ValueNameSimple = ValueNameSimple> = V;
export type VnToCvn<VN extends ValueNameSimple> = VN extends CellValueName
  ? VN
  : VN extends "checkbox"
    ? "boolean"
    : "string";

export type ValueSchema<VN extends ValueName = ValueName> = ValueSchemas[VN];

const valueSchemas: ValueSchemas = {
  ...baseValueSchemas,
  ...makeSchemasFromValueConfig(),
} as const;

export type ValueTrait<
  VN extends ValueName,
  K extends ValueSchemaKey,
> = ValueSchema<VN>[K];

export function getValTrait<
  VN extends ValueNameSimple,
  K extends ValueSchemaKey,
>(valueName: VN, key: K): ValueSchema<VN>[K] {
  return valueSchemas[valueName][key] as ValueSchema<VN>[K];
}

export type Value<VN extends ValueName = ValueName> = ValueTrait<VN, "type">;

// Via CellValue, so neither hop needs `unknown`: VnToCvn guarantees the wire type, inference can't see it.
export function toWireValue<VN extends ValueName>(
  value: Value<VN>,
): CellValue<VnToCvn<VN>> {
  return value as CellValue as CellValue<VnToCvn<VN>>;
}
