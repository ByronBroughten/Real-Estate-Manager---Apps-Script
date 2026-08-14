import type { CellValueNameToValue } from "../00_configPrecursors/configPrecursors";
import {
  configValueNames,
  type ValueConfigValues,
} from "../01_configs/04_valueConfig";
import type { Merge } from "../utils/Obj/merge";
import type { ValueSchemaBase, ValueSchemaKey } from "./03_valueSchema";
import { baseValueNames, baseValueSchemas } from "./03_baseValueSchemas";
import { makeSchemasFromValueConfig } from "./03_configValueSchemas";

const valueNames = [...baseValueNames, ...configValueNames] as const;
type ValueNameSimple = (typeof valueNames)[number];

interface BaseValues extends CellValueNameToValue {
  id: string;
}
type AllValues = Merge<BaseValues, ValueConfigValues>;
type AllValuesOrEmpty = {
  [VN in ValueNameSimple]: AllValues[VN] | "";
};

export type ValueSchemas = {
  [VN in ValueNameSimple]: ValueSchemaBase<AllValuesOrEmpty[VN]>;
};
export type ValueName<V extends ValueNameSimple = ValueNameSimple> = V;
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
