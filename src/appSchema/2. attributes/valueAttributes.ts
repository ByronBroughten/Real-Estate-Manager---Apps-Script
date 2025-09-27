import type { Merge } from "../../utils/Obj/merge";
import { type ValueName } from "../1. names/valueNames";
import { makeSchemaStructure, type MakeSchemaDict } from "../makeSchema";
import type { UnionValues } from "./valueAttributes/unionValues";
import { makeUnionValueSchemas } from "./valueAttributes/unionValues";

type Values = MakeSchemaDict<
  ValueName,
  Merge<
    {
      id: string;
      linkedIds: string[];
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

export const valueAttributes = makeSchemaStructure({} as ValueAttributesBase, {
  id: {
    makeDefault: () => "shouldNotHappen",
  },
  linkedIds: {
    makeDefault: () => [],
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
});
