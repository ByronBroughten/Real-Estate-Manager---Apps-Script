import { type SectionNameSimple } from "../1. names/sectionNames";
import type { ValueName } from "../1. names/valueNames";
import { makeSchemaStructure } from "../makeSchema";
import type { Value, ValueAttributes, ValueParams } from "./allValueAttributes";

type Varb<
  VN extends ValueName = ValueName,
  S extends string = string,
  VP extends ValueParams<VN> = ValueParams<VN>
> = {
  valueName: VN;
  valueParams: VP;
  displayName: S;
};

export type BaseVarbAttributes = Varb;

type SectionVarbsBase = {
  [SN in SectionNameSimple]: {
    [VN in VarbName<SN>]: BaseVarbAttributes;
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
  linkedId<S extends string, P extends ValueParams<"linkedId">>(
    displayName: S,
    idParams: P
  ): Varb<"linkedId", S, P> {
    return makeVarb("linkedId", displayName, idParams);
  },
  gen<VN extends Exclude<ValueName, "linkedId">, S extends string>(
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

export const allVarbAttributes = makeSchemaStructure(
  {} as SectionVarbsBase,
  {
    unit: vsS.idOnly(),
    household: vsS.idOnly(),
    expense: vsS.idOnly(),
    subsidyProgram: vsS.idOnly(),
    hhChargeOnetime: {
      id: vS.id(),
      householdId: vS.linkedId("Household ID", {
        sectionName: "household",
        onDelete: "delete",
      }),
      expenseId: vS.linkedId("Expense ID", {
        sectionName: "expense",
        onDelete: "setEmpty",
      }),
      date: vS.date(),
      amount: vS.gen("number", "Dollar amount"),
      description: vS.gen("string", "Description"),
      notes: vS.gen("string", "Notes"),
    },
    addHhChargeOnetime: {
      id: vS.id(),
      date: vS.date(),
      householdName: vS.gen("string", "Household name"),
      expenseId: vS.linkedId("Expense ID", {
        sectionName: "expense",
        onDelete: "setEmpty",
      }),
      amount: vS.gen("number", "Dollar amount"),
      description: vS.gen("string", "Description"),
      notes: vS.gen("string", "Notes"),
    },
  } as const
);

export type AllVarbAttributes = typeof allVarbAttributes;

export type VarbName<SN extends SectionNameSimple = SectionNameSimple> =
  keyof AllVarbAttributes[SN];

export type SectionVarbAttributes<SN extends SectionNameSimple> =
  AllVarbAttributes[SN];

export type VarbAttributes<
  SN extends SectionNameSimple,
  VN extends VarbName<SN>
> = SectionVarbAttributes<SN>[VN];

export type VarbValueName<
  SN extends SectionNameSimple,
  VN extends VarbName<SN>
> = VarbAttributes<SN, VN>["valueName" & keyof VarbAttributes<SN, VN>];

export type VarbValueAttributes<
  SN extends SectionNameSimple,
  VN extends VarbName<SN>
> = ValueAttributes<VarbValueName<SN, VN> & ValueName>;

export type VarbValue<
  SN extends SectionNameSimple,
  VN extends VarbName<SN>
> = Value<VarbValueName<SN, VN> & ValueName>;

export type SectionValues<SN extends SectionNameSimple> = {
  [VN in VarbName<SN>]: VarbValue<SN, VN>;
};
