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
export type TextJoin<
  S1 extends string,
  S2 extends string,
  D extends string,
> = `${S1}${D}${S2}`;

export type FilterWithSuffix<U extends string, Suffix extends string> = Extract<
  U,
  `${string}${Suffix}`
>;

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
  sentenceToCamelCase(sentence) {
    /**
     * Converts a header sentence (e.g. "Column ID") into a camelCase key
     * (e.g. "columnId"), used to robustly match row-3 headers regardless of
     * minor spacing/punctuation/capitalization differences.
     */
    return sentence
      .toLowerCase()
      .trim()
      .replace(/['’]/g, "") // remove straight & curly apostrophes
      .split(/[^a-zA-Z0-9]+/)
      .filter(Boolean)
      .map((word, index) => {
        if (index === 0) return word;
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join("");
  },
};
