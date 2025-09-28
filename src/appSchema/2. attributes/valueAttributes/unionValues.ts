import { Obj } from "../../../utils/Obj";
import type { ValueSchema } from "../allValueAttributes";

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
  [K in UnionValueName]: UnionValueArrs[K][number];
};

export type UnionValue<N extends UnionValueName = UnionValueName> =
  UnionValues[N];

function makeDefaultUnionValue<N extends UnionValueName>(
  name: N
): UnionValues[N] {
  return unionValues[name][0];
}

type UnionValueAttributesBase = {
  [K in UnionValueName]: ValueSchema<K>;
};

export function makeUnionValueSchemas(): UnionValueAttributesBase {
  const result: { [K in UnionValueName]: ValueSchema<K> } =
    {} as UnionValueAttributesBase;
  (Obj.keys(unionValues) as UnionValueName[]).forEach((name) => {
    result[name] = {
      makeDefault: () => makeDefaultUnionValue(name),
    };
  });
  return result;
}

export type UnionValueParamsDict = {
  [K in UnionValueName]: {};
};
