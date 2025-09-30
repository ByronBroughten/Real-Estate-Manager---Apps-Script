import { valS } from "../../utils/validation";
import { type SectionNameSimple } from "../1. names/sectionNames";
import type { ValueName } from "../1. names/valueNames";
import { makeSchemaStructure } from "../makeSchema";
import {
  allValueAttributes,
  type ValidateValue,
  type Value,
  type ValueAttributes,
  type ValueParams,
} from "./allValueAttributes";

type Varb<
  VN extends ValueName = ValueName,
  S extends string = string,
  VP extends ValueParams<VN> = ValueParams<VN>
> = {
  valueName: VN;
  valueParams: VP;
  displayName: S;
  validate: ValidateValue<VN>;
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
>(
  valueName: VN,
  displayName: S,
  valueParams: P,
  validate: ValidateValue<VN> = allValueAttributes[valueName]
    .defaultValidate as ValidateValue<VN>
): Varb<VN, S, P> {
  return { valueName, displayName, valueParams, validate };
}

const vS = {
  id(): Varb<"id", "ID", {}> {
    return makeVarb("id", "ID", {});
  },
  linkedId<S extends string, P extends ValueParams<"linkedId">>(
    displayName: S,
    idParams: P,
    validate?: ValidateValue<"linkedId">
  ): Varb<"linkedId", S, P> {
    return makeVarb("linkedId", displayName, idParams, validate);
  },
  gen<VN extends Exclude<ValueName, "id" | "linkedId">, S extends string>(
    valueName: VN,
    displayName: S,
    validate?: ValidateValue<VN>
  ): Varb<VN, S, {}> {
    return makeVarb(valueName, displayName, {}, validate);
  },
  date(): Varb<"date", "Date"> {
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
      householdId: vS.linkedId(
        "Household ID",
        {
          sectionName: "household",
          onDelete: "setEmpty",
        },
        valS.validate.stringNotEmpty
      ),
      expenseId: vS.linkedId("Expense ID", {
        sectionName: "expense",
        onDelete: "setEmpty",
      }),
      amount: vS.gen("number", "Dollar amount"),
      description: vS.gen(
        "string",
        "Description",
        valS.validate.stringNotEmpty
      ),
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

export type ValidateVarb<
  SN extends SectionNameSimple,
  VN extends VarbName<SN>
> = ValidateValue<VarbValueName<SN, VN> & ValueName>;

export type VarbValue<
  SN extends SectionNameSimple,
  VN extends VarbName<SN>
> = Value<VarbValueName<SN, VN> & ValueName>;

export type SectionValues<SN extends SectionNameSimple> = {
  [VN in VarbName<SN>]: VarbValue<SN, VN>;
};
