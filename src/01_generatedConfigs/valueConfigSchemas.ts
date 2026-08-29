import { vsc, type ValueSchemaBase } from "../00_base/valueSchema";
import { validationError } from "../utils/Val";
import {
  getValueConfigValueArr,
  valueConfigNames,
  type ValueConfigName,
  type ValueConfigValue,
} from "./valueConfigsTypes";

function makeDefaultValueConfigValue<VN extends ValueConfigName>(
  valueName: VN,
): ValueConfigValue<VN> {
  return getValueConfigValueArr(valueName)[0] as ValueConfigValue<VN>;
}
function validateValueConfigValue<N extends ValueConfigName>(
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
type ValueConfigSchemas = {
  [K in ValueConfigName]: ValueSchemaBase<ValueConfigValue<K>>;
};

export function makeSchemasFromValueConfig(): ValueConfigSchemas {
  return valueConfigNames.reduce((schemas, name) => {
    (schemas[name] as ValueSchemaBase<ValueConfigValue<typeof name>>) = vsc({
      type: makeDefaultValueConfigValue(name) as ValueConfigValue<
        typeof name
      >,
      makeDefault: () => makeDefaultValueConfigValue(name),
      strictValidate: (value: unknown) =>
        validateValueConfigValue(value, name),
    }) as ValueSchemaBase<ValueConfigValue<typeof name>>;
    return schemas;
  }, {} as ValueConfigSchemas);
}
