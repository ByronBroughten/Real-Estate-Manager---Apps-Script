import { Obj } from "../../../utils/Obj";
import { validationError } from "../../../utils/validation";
import { va, type ValueSchema } from "../valueAttributes";

type UnionValuesBase = {
  readonly [key: string]: readonly string[];
};
function enforceUnionValues<T extends UnionValuesBase>(t: T): T {
  return t;
}

const dropdownOptions = enforceUnionValues({
  rentPortionName: ["Household", "Subsidy program"],
} as const);
// These will be used to populate named ranges and validate data.

const unionValues = enforceUnionValues({
  ...dropdownOptions,
} as const);

type UnionValueArrs = typeof unionValues;
type UnionValueName = keyof UnionValueArrs;

export type UnionValues = {
  [K in UnionValueName]: UnionValueArrs[K][number] | "";
};

export type UnionValue<N extends UnionValueName = UnionValueName> =
  UnionValues[N];

function makeDefaultUnionValue<N extends UnionValueName>(
  name: N
): UnionValue<N> {
  return unionValues[name][0];
}

function validateUnionValue<N extends UnionValueName>(
  value: unknown,
  name: N
): UnionValue<N> {
  if (unionValues[name].includes(value as any) || value === "") {
    return value as UnionValue<N>;
  } else {
    throw validationError(value, `'${name}' union value element.`);
  }
}

type UnionValueAttributesBase = {
  [K in UnionValueName]: ValueSchema<UnionValue<K>>;
};

export function makeUnionValueSchemas(): UnionValueAttributesBase {
  return Obj.keys(unionValues).reduce((attributes, name) => {
    attributes[name] = va({
      type: "" as UnionValue<typeof name>,
      makeDefault: () => makeDefaultUnionValue(name),
      defaultValidate: (value: unknown) => validateUnionValue(value, name),
    });
    return attributes;
  }, {} as UnionValueAttributesBase);
}

export type UnionValueParamsDict = {
  [K in UnionValueName]: {};
};
