import {
  configValueNames,
  getValueConfigValueArr,
  type ConfigValueName,
  type ValueConfigValue,
} from "../1.0 Configs/4.0 valueConfig";
import { validationError } from "../utils/validation";
import { vsc, type ValueSchemaBase } from "./3.0 valueSchema";

function makeDefaultConfigValue<VN extends ConfigValueName>(
  valueName: VN,
): ValueConfigValue<VN> {
  return getValueConfigValueArr(valueName)[0] as ValueConfigValue<VN>;
}
function validateConfigValue<N extends ConfigValueName>(
  value: unknown,
  valueName: N,
): ValueConfigValue<N> {
  if (
    (getValueConfigValueArr(valueName) as readonly unknown[]).includes(value)
  ) {
    return value as ValueConfigValue<N>;
  } else {
    throw validationError(value, `'${valueName}' union value element.`);
  }
}
type ConfigValueSchemas = {
  [K in ConfigValueName]: ValueSchemaBase<ValueConfigValue<K>>;
};

export function makeSchemasFromValueConfig(): ConfigValueSchemas {
  return configValueNames.reduce((schemas, name) => {
    (schemas[name] as ValueSchemaBase<ValueConfigValue<typeof name>>) = vsc({
      type: makeDefaultConfigValue(name) as ValueConfigValue<typeof name>,
      makeDefault: () => makeDefaultConfigValue(name),
      strictValidate: (value: unknown) => validateConfigValue(value, name),
    }) as ValueSchemaBase<ValueConfigValue<typeof name>>;
    return schemas;
  }, {} as ConfigValueSchemas);
}
