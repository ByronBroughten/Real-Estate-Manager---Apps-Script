import type { Spread } from "../../utils/Obj/spread";
import { valS } from "../../utils/validation";
import { type ValueName } from "../1. names/valueNames";
import { makeSchemaStructure, type MakeSchemaDict } from "../makeSchema";
import type { LinkedIdParams } from "./valueAttributes/id";
import {
  makeLiteralValueSchemas,
  type LiteralValueParamsDict,
  type LiteralValues,
} from "./valueAttributes/literalValues";
import type {
  UnionValueParamsDict,
  UnionValues,
} from "./valueAttributes/unionValues";
import { makeUnionValueSchemas } from "./valueAttributes/unionValues";

type Values = MakeSchemaDict<
  ValueName,
  Spread<
    [
      {
        id: string;
        linkedId: string;
        string: string;
        number: number | "";
        boolean: boolean | "";
        date: Date | "";
      },
      UnionValues,
      LiteralValues
    ]
  >
>;

export type Value<VN extends ValueName = ValueName> = Values[VN];
export type ValidateValue<VN extends ValueName> = (value: unknown) => Value<VN>;
export type MakeDefaultValue<VN extends ValueName> = () => Value<VN>;

export type ValueSchema<VN extends ValueName> = {
  makeDefault: MakeDefaultValue<VN>;
  defaultValidate: ValidateValue<VN>;
};

type ValueAttributesBase = {
  [VN in ValueName]: ValueSchema<VN>;
};

export const allValueAttributes = makeSchemaStructure(
  {} as ValueAttributesBase,
  {
    id: {
      makeDefault: () => "shouldNotHappen",
      defaultValidate: valS.validate.stringNotEmpty,
    },
    linkedId: {
      makeDefault: () => "",
      defaultValidate: valS.validate.string,
    },
    string: {
      makeDefault: () => "",
      defaultValidate: valS.validate.string,
    },
    number: {
      //or empty
      makeDefault: () => 0,
      defaultValidate: valS.validate.numberOrEmpty,
    },
    boolean: {
      makeDefault: () => false,
      defaultValidate: valS.validate.boolean,
    },
    date: {
      //or empty
      makeDefault: () => new Date(),
      defaultValidate: valS.validate.dateOrEmpty,
    },
    ...makeUnionValueSchemas(),
    ...makeLiteralValueSchemas(),
  } as const
);

export type AllValueAttributes = typeof allValueAttributes;
export type ValueAttributes<VN extends ValueName> = AllValueAttributes[VN];

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
