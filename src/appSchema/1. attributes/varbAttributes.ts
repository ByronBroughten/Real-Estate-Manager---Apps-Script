import { valS } from "../../utils/validation";

import { makeSchemaStructure } from "../makeSchema";
import { type SectionNameSimple } from "./sectionAttributes";
import {
  allValueAttributes,
  type ValidateValue,
  type Value,
  type ValueAttributes,
  type ValueName,
  type ValueParams,
} from "./valueAttributes";

type Varb<
  VN extends ValueName = ValueName,
  S extends string = string,
  VP extends ValueParams<VN> = ValueParams<VN>
> = {
  valueName: VN;
  valueParams: VP;
  displayName: S;
  validate: ValidateValue<VN>;
  // makeDefault: MakeDefaultValue<VN>
};

export type BaseVarbAttributes = Varb;

type SectionVarbsBase = Record<
  SectionNameSimple,
  Record<string, BaseVarbAttributes>
>;

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
    subsidyContract: {
      id: vS.id(),
      subsidyProgramId: vS.linkedId("Subsidy program ID", {
        sectionName: "subsidyProgram",
        onDelete: "keep",
      }),
      rentPortionMonthly: vS.gen("number", "Rent portion monthly"),
      rentPortionMonthlyNext: vS.gen("number", "Rent portion monthly next"),
      rentPortionDate: vS.date(),
      rentPortionDateNext: vS.gen(
        "date",
        "Rent portion date next",
        valS.validate.dateOrEmpty
      ),
    },
    paymentGroup: vsS.idOnly(),
    unit: vsS.idOnly(),
    hhPet: vsS.idOnly(),
    otherPayer: vsS.idOnly(),
    hhPayment: {
      id: vS.id(),
      date: vS.gen("date", "Date paid (verified)", valS.validate.dateOrEmpty),
      paidBy: vS.gen("payerCategory", "Paid by"),
      amount: vS.gen("number", "Amount"),
      amountAllocated: vS.gen("amountAllocated", "Amount"),
      paymentProcessed: vS.gen("paymentProcessed", "Processed"),
      householdId: vS.linkedId("Household ID", {
        sectionName: "household",
        onDelete: "keep",
      }),
      hhMembersFullName: vS.gen(
        "hhMembersFullNamesFromId",
        "Household members full name"
      ),
      subsidyProgramId: vS.linkedId("Subsidy program ID", {
        sectionName: "subsidyContract",
        onDelete: "keep",
      }),
      subsidyProgramName: vS.gen(
        "subsidyProgramNameFromId",
        "Subsidy program name"
      ),
      otherPayerID: vS.linkedId("Other payer ID", {
        sectionName: "otherPayer",
        onDelete: "keep",
      }),
      otherPayerName: vS.gen("otherPayerNameFromId", "Other payer name"),
      notes: vS.gen("string", "Notes"),
    },
    hhPaymentAllocation: {
      id: vS.id(),
      paymentId: vS.linkedId("Payment ID", {
        sectionName: "hhPayment",
        onDelete: "delete",
      }),
      householdId: vS.linkedId("Household ID", {
        sectionName: "household",
        onDelete: "keep",
      }),
      hhMembersFullName: vS.gen("hhMembersFullNamesFromId", "Household name"),
      unitId: vS.linkedId("Unit ID", {
        sectionName: "unit",
        onDelete: "keep",
      }),
      unitName: vS.gen("unitNameFromId", "Unit name"),
      portion: vS.gen("rentPortionName", "Portion"),
      description: vS.gen("descriptionPaymentAllocation", "Description"),
      amount: vS.gen("number", "Amount"),
      subsidyContractId: vS.linkedId("Subsidy contract ID", {
        sectionName: "subsidyContract",
        onDelete: "keep",
      }),
      subsidyContractName: vS.gen(
        "subsidyContractNameFromIdOp",
        "Subsidy contract name"
      ),
    },
    hhChargeOngoing: {
      id: vS.id(),
      householdId: vS.linkedId("Household ID", {
        sectionName: "household",
        onDelete: "delete",
      }),
      hhMembersFullName: vS.gen(
        "hhMembersFullNamesFromId",
        "HH members full name"
      ),
      unitId: vS.linkedId("Unit ID", {
        sectionName: "unit",
        onDelete: "delete",
      }),
      unitName: vS.gen("unitNameFromId", "Unit name"),
      portion: vS.gen("rentPortionName", "Portion"),
      description: vS.gen("descriptionChargeOngoing", "Description"),
      amount: vS.gen("number", "Amount"),
      frequency: vS.gen("ongoingFrequency", "Frequency"),
      startDate: vS.gen("date", "Start date", valS.validate.date),
      paymentGroupId: vS.linkedId("Payment group ID", {
        sectionName: "paymentGroup",
        onDelete: "keep",
      }),
      endDate: vS.gen("date", "End date", valS.validate.dateOrEmpty),
      subsidyContractId: vS.linkedId("Subsidy contract ID", {
        sectionName: "subsidyContract",
        onDelete: "delete",
      }),
      subsidyContractName: vS.gen(
        "subsidyContractNameFromIdOp",
        "Subsidy contract name"
      ),
      petId: vS.linkedId("Pet ID", {
        sectionName: "hhPet",
        onDelete: "delete",
      }),
      petName: vS.gen("petNameFromIdOp", "Pet name"),
      notes: vS.gen("string", "Notes"),
    },
    hhCharge: {
      id: vS.id(),
      date: vS.date(),
      chargeSourceId: vS.linkedId("Charge source ID", {
        sectionName: "hhChargeOngoing",
        onDelete: "keep",
      }),
      householdId: vS.linkedId("Household ID", {
        sectionName: "household",
        onDelete: "delete",
      }),
      hhMembersFullName: vS.gen(
        "hhMembersFullNamesFromId",
        "HH members full name"
      ),
      unitId: vS.linkedId("Unit ID", {
        sectionName: "unit",
        onDelete: "delete",
      }),
      unitName: vS.gen("unitNameFromId", "Unit name"),
      portion: vS.gen("rentPortionName", "Portion"),
      description: vS.gen("descriptionCharge", "Description"),
      amount: vS.gen("number", "Amount"),
      subsidyContractId: vS.linkedId("Subsidy contract ID", {
        sectionName: "subsidyContract",
        onDelete: "keep",
      }),
      subsidyContractName: vS.gen(
        "subsidyContractNameFromIdOp",
        "Subsidy contract name"
      ),
      petId: vS.linkedId("Pet ID", {
        sectionName: "hhPet",
        onDelete: "keep",
      }),
      petName: vS.gen("petNameFromIdOp", "Pet name"),
      expenseId: vS.linkedId("Expense ID", {
        sectionName: "expense",
        onDelete: "keep",
      }),
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
      amount: vS.gen("number", "Amount"),
      description: vS.gen(
        "string",
        "Description",
        valS.validate.stringNotEmpty
      ),
      notes: vS.gen("string", "Notes"),
      enter: vS.gen("boolean", "Enter"),
    },
    household: {
      id: vS.id(),
      rentIncreaseDateLast: vS.gen("date", "Last rent increase date"),
      rentIncreaseDateNext: vS.gen("date", "Next rent increase date"),
      rentChargeMonthly: vS.gen("number", "Rent charge monthly"),
      rentChargeMonthlyNext: vS.gen("number", "Next rent charge monthly"),
      subsidyPortionMonthly: vS.gen("number", "Subsidy rent portion monthly"),
    },
    test: {
      id: vS.id(),
      dateCurrent: vS.gen("date", "Current price date"),
      dateNext: vS.gen("date", "Next price date"),
      priceCurrent: vS.gen("number", "Current price"),
      priceNext: vS.gen("number", "Next price"),
    },
    expense: vsS.idOnly(),
    subsidyProgram: vsS.idOnly(),
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

export type SectionValues<
  SN extends SectionNameSimple,
  VNS extends VarbName<SN> = VarbName<SN>
> = {
  [VN in VNS]: VarbValue<SN, VN>;
};
