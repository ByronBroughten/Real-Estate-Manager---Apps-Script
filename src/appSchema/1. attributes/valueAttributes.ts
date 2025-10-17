import type { Spread } from "../../utils/Obj/spread";
import { valS } from "../../utils/validation";
import { makeSchemaStructure, type MakeSchemaDict } from "../makeSchema";
import type { LinkedIdParams } from "./valueAttributes/id";
import {
  makeLiteralValueSchemas,
  type LiteralValueParamsDict,
} from "./valueAttributes/literalValues";
import type { UnionValueParamsDict } from "./valueAttributes/unionValues";
import { makeUnionValueSchemas } from "./valueAttributes/unionValues";

type MakeDefaultValueBase<V extends unknown> = () => V;
type ValidateValueBase<V extends unknown> = (value: unknown) => V;

export type ValueSchema<V extends unknown = unknown> = {
  type: V;
  makeDefault: MakeDefaultValueBase<V>;
  defaultValidate: ValidateValueBase<V>;
};

type ValueAttributesBase = Record<string, ValueSchema>;

export function va<V extends unknown>(props: {
  type: V;
  makeDefault: MakeDefaultValueBase<V>;
  defaultValidate: ValidateValueBase<V>;
}) {
  return props;
}

export const allValueAttributes = makeSchemaStructure(
  {} as ValueAttributesBase,
  {
    id: va({
      type: "" as string,
      makeDefault: () => "shouldNotHappen",
      defaultValidate: valS.validate.string,
    }),
    linkedId: va({
      type: "" as string,
      makeDefault: () => "",
      defaultValidate: valS.validate.string,
    }),
    string: va({
      type: "" as string,
      makeDefault: () => "",
      defaultValidate: valS.validate.string,
    }),
    number: va({
      //or empty
      type: "" as number | string,
      makeDefault: () => 0,
      defaultValidate: valS.validate.numberOrEmpty,
    }),
    boolean: va({
      type: "" as boolean | string,
      makeDefault: () => false,
      defaultValidate: valS.validate.boolean,
    }),
    date: va({
      //or empty
      type: "" as Date | string,
      makeDefault: () => new Date(),
      defaultValidate: valS.validate.dateOrEmptyOrFormula,
    }),
    ...makeUnionValueSchemas(),
    ...makeLiteralValueSchemas(),
  } as const
);

export type AllValueAttributes = typeof allValueAttributes;

type ValueNameSimple = keyof AllValueAttributes;
export type ValueName<V extends ValueNameSimple = ValueNameSimple> = V;
export type ValueAttributes<VN extends ValueName> = AllValueAttributes[VN];
export type Value<VN extends ValueName = ValueName> =
  ValueAttributes<VN>["type"];

type ValueParamsDict = MakeSchemaDict<
  ValueName,
  Spread<
    [
      {
        linkedId: LinkedIdParams;
        id: {};
        string: {};
        number: {};
        boolean: {};
        date: {};
      },
      UnionValueParamsDict,
      LiteralValueParamsDict
    ]
  >
>;

export type ValueParams<VN extends ValueName> = ValueParamsDict[VN];

export type MakeDefaultValue<VN extends ValueName> = () => Value<VN>;
export type ValidateValue<VN extends ValueName> = (value: unknown) => Value<VN>;
