export type RemoveFirstN<
  T extends string,
  N extends number,
  ARR extends any[] = [],
> = ARR["length"] extends N
  ? T
  : T extends `${string}${infer Rest}`
    ? RemoveFirstN<Rest, N, [...ARR, any]>
    : T;

export type TakeFirstN<
  S extends string,
  N extends number,
  Acc extends any[] = [],
> = Acc["length"] extends N
  ? ""
  : S extends `${infer First}${infer Rest}`
    ? `${First}${TakeFirstN<Rest, N, [...Acc, any]>}`
    : S;

export type CombineStrings<S1 extends string, S2 extends string> = `${S1}${S2}`;

export const Str = {
  combineStrings: <S1 extends string, S2 extends string>(
    str1: S1,
    str2: S2,
  ): CombineStrings<S1, S2> => {
    return `${str1}${str2}` as CombineStrings<S1, S2>;
  },
  removeFirstN<T extends string, N extends number>(
    str: T,
    n: N,
  ): RemoveFirstN<T, N> {
    return str.split("").slice(n).join("") as RemoveFirstN<T, N>;
  },
  takeFirstN<T extends string, N extends number>(
    str: T,
    n: N,
  ): TakeFirstN<T, N> {
    return str.split("").slice(0, n).join("") as TakeFirstN<T, N>;
  },
};
