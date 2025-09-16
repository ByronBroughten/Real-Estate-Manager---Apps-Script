type UnionValuesBase = {
  readonly [key: string]: readonly string[];
};
function enforceUnionValues<T extends UnionValuesBase>(t: T): T {
  return t;
}

const dropdownOptions = enforceUnionValues({
  rentPortionNames: ["Household", "Subsidy program"],
} as const);
// These will be used to populate named ranges and validate data.

const unionValues = enforceUnionValues({
  ...dropdownOptions,
} as const);
type UnionValuesSimple = typeof unionValues;

type UnionValueNameSimple = keyof UnionValuesSimple;
export type UnionValueName<
  N extends UnionValueNameSimple = UnionValueNameSimple
> = N;

export type UnionValue<N extends UnionValueNameSimple = UnionValueNameSimple> =
  UnionValuesSimple[N][number];
