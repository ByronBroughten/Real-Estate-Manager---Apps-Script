import type { Merge } from "../../utils/Obj/merge";
import { type SectionNameSimple } from "../1. names/sectionNames";
import type { VarbName } from "../1. names/sectionVarbNames";
import type { ValueName } from "../1. names/valueNames";
import { makeSchemaStructure, type MakeSchemaDict } from "../makeSchema";
import type { LinkedIdParams } from "./valueAttributes/id";
import type { UnionValueParamsDict } from "./valueAttributes/unionValues";

type ValueParamsDict = MakeSchemaDict<
  ValueName,
  Merge<
    {
      linkedIds: LinkedIdParams;
      id: {};
      string: {};
      number: {};
      boolean: {};
      date: {};
    },
    UnionValueParamsDict
  >
>;

type ValueParams<VN extends ValueName> = ValueParamsDict[VN];

type Varb<
  VN extends ValueName = ValueName,
  S extends string = string,
  VP extends ValueParams<VN> = ValueParams<VN>
> = {
  valueName: VN;
  valueParams: VP;
  displayName: S;
};

type SectionVarbsBase = {
  [SN in SectionNameSimple]: {
    [VN in VarbName<SN>]: Varb;
  };
};

function makeVarb<
  VN extends ValueName,
  S extends string,
  P extends ValueParams<VN>
>(valueName: VN, displayName: S, valueParams: P): Varb<VN, S, P> {
  return { valueName, displayName, valueParams };
}

const vS = {
  id(): Varb<"id", "ID", {}> {
    return makeVarb("id", "ID", {});
  },
  linkedIds<S extends string, P extends ValueParams<"linkedIds">>(
    displayName: S,
    idParams: P
  ): Varb<"linkedIds", S, P> {
    return makeVarb("linkedIds", displayName, idParams);
  },
  gen<VN extends Exclude<ValueName, "linkedIds">, S extends string>(
    valueName: VN,
    displayName: S
  ): Varb<VN, S, {}> {
    return makeVarb(valueName, displayName, {});
  },
  date() {
    return this.gen("date", "Date");
  },
};

const vsS = {
  idOnly(): { id: Varb<"id", "ID", {}> } {
    return { id: vS.id() };
  },
};

export const sectionVarbs = makeSchemaStructure({} as SectionVarbsBase, {
  unit: vsS.idOnly(),
  household: vsS.idOnly(),
  expense: vsS.idOnly(),
  subsidy: vsS.idOnly(),
  hhChargeOnetime: {
    id: vS.id(),
    householdId: vS.linkedIds("Household ID", {
      sectionName: "household",
      relationship: "parent",
    }),
    expenseId: vS.linkedIds("Expense ID", {
      sectionName: "expense",
      relationship: "none",
    }),
    subsidyId: vS.linkedIds("Subsidy ID", {
      sectionName: "subsidy",
      relationship: "none",
    }),
    date: vS.date(),
    amount: vS.gen("number", "Dollar amount"),
    description: vS.gen("string", "Description"),
    notes: vS.gen("string", "Notes"),
    portion: vS.gen("rentPortionName", "Portion"),
  },
  addHhChargeOnetime: {
    id: vS.id(),
    date: vS.date(),
    householdName: vS.linkedIds("Household ID", {
      sectionName: "household",
      relationship: "parent",
    }),
    portion: vS.gen("rentPortionName", "Portion"),
    amount: vS.gen("number", "Dollar amount"),
    description: vS.gen("string", "Description"),
    notes: vS.gen("string", "Notes"),
  },
});
