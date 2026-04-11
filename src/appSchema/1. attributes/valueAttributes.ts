import { utils } from "../../utilitiesGeneral";
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
import { va, type ValueSchema } from "./valueAttributes/valueAttribute";

type ValueAttributesBase = Record<string, ValueSchema>;

export const allValueAttributes = makeSchemaStructure(
  {} as ValueAttributesBase,
  {
    idFormula: va({
      type: "" as string,
      makeDefault: () => "shouldNotHappen",
      defaultValidate: valS.validate.string,
    }),
    baseId: va({
      type: "" as string,
      makeDefault: () => utils.id.makeBase(),
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
      makeDefault: () => "",
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
    // literal: va({
    //   type: "" as CellValue,
    //   makeDefault: () => "shouldNotHappen",
    //   defaultValidate: valS.validate.
    // }),
    ...makeUnionValueSchemas(),
    ...makeLiteralValueSchemas(),
  } as const,
);

export type AllValueAttributes = typeof allValueAttributes;

type ValueNameSimple = keyof AllValueAttributes;
export type ValueName<V extends ValueNameSimple = ValueNameSimple> = V;
export type ValueAttributes<VN extends ValueName = ValueName> =
  AllValueAttributes[VN];
export type Value<VN extends ValueName = ValueName> =
  ValueAttributes<VN>["type"];

type ValueParamsDict = MakeSchemaDict<
  ValueName,
  Spread<
    [
      {
        linkedId: LinkedIdParams;
        idFormula: {};
        baseId: {};
        string: {};
        number: {};
        boolean: {};
        date: {};
      },
      UnionValueParamsDict,
      LiteralValueParamsDict,
    ]
  >
>;

export type ValueParams<VN extends ValueName> = ValueParamsDict[VN];

export type MakeDefaultValue<VN extends ValueName> = () => Value<VN>;
export type ValidateValue<VN extends ValueName> = (value: unknown) => Value<VN>;
