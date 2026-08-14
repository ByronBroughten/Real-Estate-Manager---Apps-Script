import {
  valueTraitNames,
  getValueTraitValueArr,
  type ValueTraitName,
  type ValueTraitValue,
} from "../01_configs/04_valueTraits";
import { validationError } from "../utils/validation";
import { vsc, type ValueSchemaBase } from "./03_valueSchema";

function makeDefaultValueTrait<VN extends ValueTraitName>(
  valueName: VN,
): ValueTraitValue<VN> {
  return getValueTraitValueArr(valueName)[0] as ValueTraitValue<VN>;
}
function validateValueTrait<N extends ValueTraitName>(
  value: unknown,
  valueName: N,
): ValueTraitValue<N> {
  if (
    (getValueTraitValueArr(valueName) as readonly unknown[]).includes(value)
  ) {
    return value as ValueTraitValue<N>;
  } else {
    throw validationError(value, `'${valueName}' union value element.`);
  }
}
type ConfigValueSchemas = {
  [K in ValueTraitName]: ValueSchemaBase<ValueTraitValue<K>>;
};

export function makeSchemasFromValueConfig(): ConfigValueSchemas {
  return valueTraitNames.reduce((schemas, name) => {
    (schemas[name] as ValueSchemaBase<ValueTraitValue<typeof name>>) = vsc({
      type: makeDefaultValueTrait(name) as ValueTraitValue<typeof name>,
      makeDefault: () => makeDefaultValueTrait(name),
      strictValidate: (value: unknown) => validateValueTrait(value, name),
    }) as ValueSchemaBase<ValueTraitValue<typeof name>>;
    return schemas;
  }, {} as ConfigValueSchemas);
}
