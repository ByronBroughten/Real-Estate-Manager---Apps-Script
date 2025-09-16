import type { Merge } from "./merge";

export type UnionObj<Union extends string, P extends string, R extends any> = {
  [K in Union]: Merge<Record<P, K>, R>;
}[Union];

type Example = UnionObj<"a" | "b", "type", { value: number }>;
