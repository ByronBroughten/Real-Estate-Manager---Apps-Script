import type { Merge } from "../../utils/Obj/merge";
import { type ValueName } from "../1. names/valueNames";
import { makeSchemaStructure, type MakeSchemaDict } from "../makeSchema";
import type { LinkedIdParams } from "./valueAttributes/id";
import type {
  UnionValueParamsDict,
  UnionValues,
} from "./valueAttributes/unionValues";
import { makeUnionValueSchemas } from "./valueAttributes/unionValues";

type Values = MakeSchemaDict<
  ValueName,
  Merge<
    {
      id: string;
      linkedId: string;
      string: string;
      number: number;
      boolean: boolean;
      date: Date;
    },
    UnionValues
  >
>;

export type Value<VN extends ValueName> = Values[VN];

export type ValueSchema<VN extends ValueName> = {
  makeDefault: () => Value<VN>;
};

type ValueAttributesBase = {
  [VN in ValueName]: ValueSchema<VN>;
};

export const allValueAttributes = makeSchemaStructure(
  {} as ValueAttributesBase,
  {
    id: {
      makeDefault: () => "shouldNotHappen",
    },
    linkedId: {
      makeDefault: () => "shouldNotHappen",
    },
    string: {
      makeDefault: () => "",
    },
    number: {
      makeDefault: () => 0,
    },
    boolean: {
      makeDefault: () => false,
    },
    date: {
      makeDefault: () => new Date(),
    },
    ...makeUnionValueSchemas(),
  } as const
);

export type AllValueAttributes = typeof allValueAttributes;
export type ValueAttributes<VN extends ValueName> = AllValueAttributes[VN];

type ValueParamsDict = MakeSchemaDict<
  ValueName,
  Merge<
    {
      linkedId: LinkedIdParams;
      id: {};
      string: {};
      number: {};
      boolean: {};
      date: {};
    },
    UnionValueParamsDict
  >
>;

export type ValueParams<VN extends ValueName> = ValueParamsDict[VN];
