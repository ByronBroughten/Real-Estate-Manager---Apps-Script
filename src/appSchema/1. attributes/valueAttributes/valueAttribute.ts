export type ValueSchema<V extends unknown = unknown> = {
  type: V;
  makeDefault: MakeDefaultValueBase<V>;
  defaultValidate: ValidateValueBase<V>;
};

type MakeDefaultValueBase<V extends unknown> = () => V;
type ValidateValueBase<V extends unknown> = (value: unknown) => V;

export function va<V extends unknown>(props: {
  type: V;
  makeDefault: MakeDefaultValueBase<V>;
  defaultValidate: ValidateValueBase<V>;
}) {
  return props;
}
