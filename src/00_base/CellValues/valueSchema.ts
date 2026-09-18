import type { NotEmpty } from "./cellValues";

export type ValueSchemaBase<V = unknown> = {
  type: V;
  makeDefault: MakeDefaultValueBase<V>;
  strictValidate: ValidateValueBase<V>;
  // What a blank cell reads as, or null where a blank stays a blank.
  blankReadsAs: NotEmpty<V> | null;
};

export type ValueSchemaKey = keyof ValueSchemaBase;

type MakeDefaultValueBase<V> = () => V;
type ValidateValueBase<V> = (value: unknown) => NotEmpty<V>;

export function vsc<V>(props: ValueSchemaBase<V>): ValueSchemaBase<V> {
  return props;
}
