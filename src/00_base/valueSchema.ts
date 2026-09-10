import type { NotEmpty } from "./base";

export type ValueSchemaBase<V extends unknown = unknown> = {
  type: V;
  makeDefault: MakeDefaultValueBase<V>;
  strictValidate: ValidateValueBase<V>;
  // What a blank cell reads as, or null where a blank stays a blank.
  blankReadsAs: NotEmpty<V> | null;
};

export type ValueSchemaKey = keyof ValueSchemaBase;

type MakeDefaultValueBase<V extends unknown> = () => V;
type ValidateValueBase<V extends unknown> = (value: unknown) => NotEmpty<V>;

export function vsc<V extends unknown>(
  props: ValueSchemaBase<V>,
): ValueSchemaBase<V> {
  return props;
}
