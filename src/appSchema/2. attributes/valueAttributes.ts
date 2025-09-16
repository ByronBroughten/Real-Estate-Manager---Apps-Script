import { type ValueName } from "../1. names/valueNames";
import { makeSchemaStructure, type MakeSchemaDict } from "../makeSchema";

type Values = MakeSchemaDict<
  ValueName,
  {
    id: string;
    string: string;
    number: number;
    boolean: boolean;
    date: Date;
  }
>;

export type Value<VN extends ValueName> = Values[VN];

type ValueSchema<VN extends ValueName> = {
  makeDefault: () => Value<VN>;
};

type ValueAttributesBase = {
  [VN in ValueName]: ValueSchema<VN>;
};

export const valueAttributes = makeSchemaStructure({} as ValueAttributesBase, {
  id: {
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
});
