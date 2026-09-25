import { Obj } from "../utils/Obj";
import { type Configs, installedConfigs } from "./configRegister";

export type ValueConfigs = Configs["valueConfigs"];
export type ValueConfigName = keyof ValueConfigs;
export function valueConfigNames(): readonly ValueConfigName[] {
  return Obj.keys(installedConfigs().valueConfigs);
}

export type ValueConfigValues = {
  [K in ValueConfigName]: ValueConfigs[K][number];
};
export type ValueConfigValue<N extends ValueConfigName = ValueConfigName> =
  ValueConfigValues[N];

export function getValueConfigValueArr<K extends ValueConfigName>(
  key: K,
): ValueConfigs[K] {
  return installedConfigs().valueConfigs[key];
}
