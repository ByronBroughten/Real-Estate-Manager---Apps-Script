import type { Merge } from "./merge";

type CommonKeys<T extends object> = keyof T;
type AllKeys<T> = T extends any ? keyof T : never;

type NonCommonKeys<T extends object> = Exclude<AllKeys<T>, CommonKeys<T>>;
type PickType<T, K extends AllKeys<T>> = T extends { [k in K]?: any }
  ? T[K]
  : undefined;

type PickTypeOf<T, K extends string | number | symbol> = K extends AllKeys<T>
  ? PickType<T, K>
  : never;

export type MergeUnion<T extends object> = Merge<
  { [k in CommonKeys<T>]: PickTypeOf<T, k> },
  { [k in NonCommonKeys<T>]?: PickTypeOf<T, k> }
>;
export type MergeUnionFull<O extends object> = {
  [K in AllKeys<O>]: NonNullable<PickType<ExcludeEmpty<O>, K>>;
};

type AtLeastOne<T, U = { [K in keyof T]: Pick<T, K> }> = Partial<T> &
  U[keyof U];
type ExcludeEmpty<T> = T extends AtLeastOne<T> ? T : never;
type U = {} | { a: number } | { b: string };
type TesteExcludEmpty = ExcludeEmpty<U>; // { a: number } | { b: string }

type AB =
  | {
      a: "1";
      b: "2";
    }
  | {
      a: 5;
      c: 4;
    };

type Test = MergeUnion<AB>;
