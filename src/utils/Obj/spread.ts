import type { Merge } from "./merge";

export type Spread<A extends readonly [...any]> = A extends [
  infer L,
  ...infer R
]
  ? Merge<L, Spread<R>>
  : unknown;

type Sample1 = {
  a: 1;
  b: 2;
};
type Sample2 = {
  a: 2;
  b: 2;
  c: 3;
};
type Test1 = Spread<[Sample1, Sample2]>;

type Sample3 = {
  a: 3;
  d: 4;
};
type Test3 = Spread<[Test1, Sample3]>;

function _test<T extends Test3>(_t: T): void {}

_test({
  b: 2,
  c: 3,
  a: 3,
  d: 4,
});

export function spread<A extends object[]>(...a: [...A]) {
  return Object.assign({}, ...a) as Spread<A>;
}
