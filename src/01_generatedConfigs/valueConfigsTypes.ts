import { Obj } from "../utils/Obj";
import { valueConfigs } from "./valueConfigs";

export type ValueConfigs = typeof valueConfigs;
export type ValueConfigName = keyof ValueConfigs;
export const valueConfigNames: readonly ValueConfigName[] =
  Obj.keys(valueConfigs);

export type ValueConfigValues = {
  [K in ValueConfigName]: ValueConfigs[K][number];
};
export type ValueConfigValue<N extends ValueConfigName = ValueConfigName> =
  ValueConfigValues[N];

export function getValueConfigValueArr<K extends ValueConfigName>(
  key: K,
): ValueConfigs[K] {
  return valueConfigs[key];
}
