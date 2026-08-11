export type ValueSchemaBase<V extends unknown = unknown> = {
  type: V;
  makeDefault: MakeDefaultValueBase<V>;
  strictValidate: ValidateValueBase<V>;
};

export type ValueSchemaKey = keyof ValueSchemaBase;

type MakeDefaultValueBase<V extends unknown> = () => V;
type ValidateValueBase<V extends unknown> = (value: unknown) => V;

export function vsc<V extends unknown>(props: {
  type: V;
  makeDefault: MakeDefaultValueBase<V>;
  strictValidate: ValidateValueBase<V>;
}): ValueSchemaBase<V> {
  return props;
}
