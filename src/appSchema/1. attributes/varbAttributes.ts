import type { Merge } from "../../utils/Obj/merge";
import { valS } from "../../utils/validation";

import { makeSchemaStructure } from "../makeSchema";
import { validateSnObj, type SectionNameSimple } from "./sectionAttributes";
import {
  allValueAttributes,
  type MakeDefaultValue,
  type ValidateValue,
  type Value,
  type ValueAttributes,
  type ValueName,
  type ValueParams,
} from "./valueAttributes";
import { validateUnionValueNoEmpty } from "./valueAttributes/unionValues";

type Varb<
  VN extends ValueName = ValueName,
  S extends string = string,
  VP extends ValueParams<VN> = ValueParams<VN>
> = {
  valueName: VN;
  valueParams: VP;
  displayName: S;
  validate: ValidateValue<VN>;
  makeDefault: MakeDefaultValue<VN>;
};

export type BaseVarbAttributes = Varb;

type SectionVarbsBase = Record<
  SectionNameSimple,
  Record<string, BaseVarbAttributes>
>;

type MakeVarbProps<
  VN extends ValueName,
  S extends string,
  P extends ValueParams<VN>
> = Merge<
  {
    valueName: VN;
    displayName: S;
    valueParams: P;
  },
  MakeVarbOptions<VN>
>;

type MakeVarbOptions<VN extends ValueName> = {
  validate?: ValidateValue<VN>;
  makeDefault?: MakeDefaultValue<VN>;
};

function makeVarb<
  VN extends ValueName,
  S extends string,
  P extends ValueParams<VN>
>({
  valueName,
  makeDefault = allValueAttributes[valueName].makeDefault,
  validate = allValueAttributes[valueName].defaultValidate,
  ...rest
}: MakeVarbProps<VN, S, P>): Varb<VN, S, P> {
  return {
    valueName,
    makeDefault,
    validate,
    ...rest,
  };
}

const linkedIdDisplayNames = validateSnObj({
  property: "Property ID",
  unit: "Unit ID",
  household: "Household ID",
});

type LinkedIdSn = keyof typeof linkedIdDisplayNames;

type LinkedIdProps = {
  displayName?: string;
  default?: ValueName;
  required?: boolean;
};

const vS = {
  id(): Varb<"id", "ID", {}> {
    return makeVarb({
      valueName: "id",
      displayName: "ID",
      valueParams: {},
    });
  },
  linkedId<S extends string, P extends ValueParams<"linkedId">>(
    displayName: S,
    idParams: P,
    options: MakeVarbOptions<"linkedId"> = {}
  ): Varb<"linkedId", S, P> {
    return makeVarb({
      valueName: "linkedId",
      displayName,
      valueParams: idParams,
      ...options,
    });
  },
  linkedIdNext<SN extends LinkedIdSn>(
    sectionName: SN,
    props: LinkedIdProps = {}
  ): Varb<"linkedId", string> {
    const snToSd = validateSnObj({
      property: "Property ID",
      unit: "Unit ID",
      household: "Household ID",
    });

    const valueParams = {
      sectionName,
      onDelete: "setEmpty",
    } as ValueParams<"linkedId">;

    return makeVarb({
      valueName: "linkedId",
      displayName: props.displayName ?? snToSd[sectionName],
      valueParams,
      ...(props.required && {
        validate: valS.validate.stringNotEmpty,
      }),
      ...(props.default && {
        makeDefault: allValueAttributes[props.default]
          .makeDefault as () => string,
      }),
    });
  },
  gen<VN extends Exclude<ValueName, "id" | "linkedId">, S extends string>(
    valueName: VN,
    displayName: S,
    options: MakeVarbOptions<VN> = {}
  ): Varb<VN, S, {}> {
    return makeVarb({
      valueName,
      displayName,
      valueParams: {},
      ...options,
    });
  },
  stringNotEmpty<S extends string>(displayName: S): Varb<"string", S> {
    return this.gen("string", displayName, {
      validate: valS.validate.stringNotEmpty,
    });
  },
  date(): Varb<"date", "Date"> {
    return this.gen("date", "Date");
  },
  dateDefaultToday(): Varb<"date", "Date"> {
    return this.gen("date", "Date", {
      makeDefault: defaults.todayFormula,
    });
  },
};

const vsS = {
  idOnly(): { id: Varb<"id", "ID", {}> } {
    return { id: vS.id() };
  },
};

const defaults = {
  todayFormula: () => "=TODAY()",
};

export const allVarbAttributes = makeSchemaStructure(
  {} as SectionVarbsBase,
  {
    buildHhLedger: {
      id: vS.id(),
      householdName: vS.gen("string", "Household name"),
      householdId: vS.linkedId(
        "Household ID",
        {
          sectionName: "household",
          onDelete: "setEmpty",
        },
        {
          makeDefault: allValueAttributes.hhIdFromNameOp.makeDefault,
        }
      ),
      portion: vS.gen("rentPortionName", "Portion"),
      subsidyContractName: vS.gen("string", "Subsidy contract name"),
      subsidyContractId: vS.linkedId(
        "Subsidy contract ID",
        {
          sectionName: "subsidyContract",
          onDelete: "setEmpty",
        },
        {
          makeDefault:
            allValueAttributes.subsidyContractIdFromNameOp.makeDefault,
        }
      ),
      enter: vS.gen("boolean", "Enter"),
    },
    hhLedger: {
      id: vS.id(),
      date: vS.date(),
      unitName: vS.gen("string", "Unit"),
      description: vS.gen("descriptionsTransactionsAll", "Description"),
      issuer: vS.gen("string", "Issuer"),
      charge: vS.gen("number", "Charge"),
      payment: vS.gen("number", "Payment"),
      balance: vS.gen("ledgerBalance", "Amount owed"),
      notes: vS.gen("string", "Notes"),
    },
    subsidyContract: {
      id: vS.id(),
      subsidyProgramId: vS.linkedId("Subsidy program ID", {
        sectionName: "subsidyProgram",
        onDelete: "keep",
      }),
      householdId: vS.linkedId("Household ID", {
        sectionName: "household",
        onDelete: "keep",
      }),
      unitId: vS.linkedId(
        "Unit ID",
        {
          sectionName: "unit",
          onDelete: "keep",
        },
        {
          makeDefault: allValueAttributes.unitNameFromHouseholdIdOp.makeDefault,
        }
      ),
      paymentGroupId: vS.linkedId("Payment group ID", {
        sectionName: "paymentGroup",
        onDelete: "keep",
      }),
      rentPortionMonthly: vS.gen("number", "Rent portion monthly"),
      rentPortionMonthlyNext: vS.gen("number", "Next subsidy portion monthly"),
      rentPortionDate: vS.gen("date", "Rent portion date", {
        validate: valS.validate.date,
      }),
      rentPortionDateNext: vS.gen("date", "Next subsidy portion date", {
        validate: valS.validate.dateOrEmpty,
      }),
    },
    paymentGroup: {
      id: vS.id(),
      payerCategory: vS.gen("payerCategory", "Payer category"),
      householdId: vS.linkedId("Household ID", {
        sectionName: "household",
        onDelete: "keep",
      }),
      hhName: vS.gen("hhNameFromIdOp", "Household name"),
      subsidyProgramId: vS.linkedId("Subsidy program ID", {
        sectionName: "subsidyContract",
        onDelete: "keep",
      }),
      subsidyProgramName: vS.gen(
        "subsidyProgramNameFromIdOp",
        "Subsidy program name"
      ),
      otherPayerId: vS.linkedId("Other payer ID", {
        sectionName: "otherPayer",
        onDelete: "keep",
      }),
      otherPayerName: vS.gen("otherPayerNameFromIdOp", "Other payer name"),
      notes: vS.gen("string", "Notes"),
    },
    unit: vsS.idOnly(),
    hhPet: vsS.idOnly(),
    otherPayer: vsS.idOnly(),
    hhPayment: {
      id: vS.id(),
      date: vS.gen("date", "Date", {
        validate: valS.validate.date,
      }),
      householdAllocated: vS.gen("householdAllocated", "Household allocated"),
      numAllocated: vS.gen("numAllocated", "Num allocated"),
      payerCategory: vS.gen("payerCategory", "Payer category"),
      payer: vS.gen("payer", "Payer"),
      amount: vS.gen("number", "Amount"),
      amountAllocated: vS.gen("amountAllocated", "Amount allocated"),
      detailsVerified: vS.gen("yesOrNo", "Details verified"),
      paymentProcessed: vS.gen("paymentProcessed", "Processed"),
      householdId: vS.linkedId("Household ID", {
        sectionName: "household",
        onDelete: "keep",
      }),
      hhName: vS.gen("hhNameFromIdOp", "Household name"),
      subsidyProgramId: vS.linkedId("Subsidy program ID", {
        sectionName: "subsidyContract",
        onDelete: "keep",
      }),
      subsidyProgramName: vS.gen(
        "subsidyProgramNameFromIdOp",
        "Subsidy program name"
      ),
      otherPayerId: vS.linkedId("Other payer ID", {
        sectionName: "otherPayer",
        onDelete: "keep",
      }),
      otherPayerName: vS.gen("otherPayerNameFromIdOp", "Other payer name"),
      notes: vS.gen("string", "Notes"),
    },
    hhPaymentAllocation: {
      id: vS.id(),
      paymentId: vS.linkedId("Payment ID", {
        sectionName: "hhPayment",
        onDelete: "delete",
      }),
      date: vS.gen("getPaymentDate", "Payment date"),
      payer: vS.gen("getPayer", "Payer"),
      processed: vS.gen("getPaymentProcessed", "Processed"),
      householdId: vS.linkedId("Household ID", {
        sectionName: "household",
        onDelete: "keep",
      }),
      householdName: vS.gen("hhNameFromId", "Household name"),
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
      notes: vS.gen("string", "Notes"),
    },
    expense: {
      id: vS.id(),
      date: vS.date(),
      propertyName: vS.gen("propertyNameFromId", "Property name"),
      propertyId: vS.linkedIdNext("property", { required: true }),
      unitName: vS.gen("unitNameFromIdOp", "Unit name"),
      unitId: vS.linkedIdNext("unit", { required: false }),
      propertyYearName: vS.gen("propertyYearName", "Property year name"),
      biller: vS.gen("string", "Biller"),
      description: vS.gen("string", "Description"),
      category: vS.gen("expenseCategory", "Expense category"),
      receiptFormat: vS.gen("receiptFormat", "Receipt format", {
        makeDefault: () => "Electronic",
      }),
      taxAdjust: vS.gen("taxAdjust", "Tax adjust"),
      deductibleAmount: vS.gen("deductibleAmount", "Deductible amount"),
      amount: vS.gen("number", "Amount"),
      notes: vS.gen("string", "Notes"),
    },
    addExpense: {
      id: vS.id(),
      date: vS.dateDefaultToday(),
      billerName: vS.gen("string", "Biller name"),
      propertyName: vS.gen("string", "Property name"),
      propertyId: vS.linkedIdNext("property", {
        default: "propertyIdFromName",
        required: true,
      }),
      unitId: vS.linkedIdNext("unit", {
        default: "unitIdFromNameOp",
        required: false,
      }),
      unitName: vS.gen("string", "Unit name"),
      expenseCategory: vS.gen("expenseCategory", "Expense category"),
      description: vS.gen("string", "Description"),
      receiptFormat: vS.gen("receiptFormat", "Receipt format", {
        makeDefault: () => "Electronic",
      }),
      amount: vS.gen("number", "Amount"),
      taxAdjust: vS.gen("taxAdjust", "Tax adjust", {
        makeDefault: () => "",
      }),
      hhToChargeName: vS.gen("string", "Household to charge"),
      householdId: vS.linkedIdNext("household", {
        default: "hhIdFromToChargeOp",
        required: false,
      }),
      hhChargeLesserAmount: vS.gen("number", "Household charge lesser amount"),
      expenseNotes: vS.gen("string", "Expense notes"),
      hhChargeNotes: vS.gen("string", "HH notes"),
      enter: vS.gen("boolean", "Enter"),
    },
    addHhPaymentOnetime: {
      id: vS.id(),
      date: vS.dateDefaultToday(),
      // Allocation
      householdName: vS.gen("string", "Household name"),
      householdId: vS.linkedId(
        "Household ID",
        {
          sectionName: "household",
          onDelete: "setEmpty",
        },
        {
          makeDefault: allValueAttributes.hhIdFromNameOp.makeDefault,
          validate: valS.validate.stringNotEmpty,
        }
      ),
      portion: vS.gen("rentPortionName", "Portion"),
      description: vS.gen("descriptionPaymentAllocation", "Description"),
      amount: vS.gen("number", "Amount"),
      unitName: vS.gen("string", "Unit name", {
        makeDefault: allValueAttributes.unitNameFromHouseholdIdOp.makeDefault,
      }),
      unitId: vS.linkedId(
        "Unit ID",
        {
          sectionName: "unit",
          onDelete: "setEmpty",
        },
        {
          makeDefault: allValueAttributes.unitIdFromNameOp.makeDefault,
          validate: valS.validate.stringNotEmpty,
        }
      ),
      subsidyContractName: vS.gen("string", "Subsidy contract name"),
      subsidyContractId: vS.linkedId(
        "Subsidy contract ID",
        {
          sectionName: "subsidyContract",
          onDelete: "setEmpty",
        },
        {
          makeDefault:
            allValueAttributes.subsidyContractIdFromNameOp.makeDefault,
          validate: valS.validate.string,
        }
      ),
      // Payment
      payerCategory: vS.gen("payerCategory", "Payer category"),
      detailsVerified: vS.gen("yesOrNo", "Details verified", {
        makeDefault: () => "No",
      }),
      paymentHhName: vS.gen("string", "Payment HH name", {
        makeDefault: () => `=SR("Household name")`,
      }),
      paymentHhId: vS.linkedId(
        "Payment HH ID",
        {
          sectionName: "household",
          onDelete: "setEmpty",
        },
        {
          makeDefault: allValueAttributes.paymentHhIdFromNameOp.makeDefault,
          validate: valS.validate.string,
        }
      ),
      subsidyProgramName: vS.gen("string", "Subsidy program name"),
      subsidyProgramId: vS.linkedId(
        "Subsidy program ID",
        {
          sectionName: "subsidyProgram",
          onDelete: "setEmpty",
        },
        {
          makeDefault:
            allValueAttributes.subsidyProgramIdFromNameOp.makeDefault,
          validate: valS.validate.string,
        }
      ),
      otherPayerName: vS.gen("string", "Other payer name"),
      otherPayerId: vS.linkedId(
        "Other payer ID",
        {
          sectionName: "otherPayer",
          onDelete: "setEmpty",
        },
        {
          makeDefault: allValueAttributes.otherPayerIdFromNameOp.makeDefault,
          validate: valS.validate.string,
        }
      ),
      notes: vS.gen("string", "Notes"),
      enter: vS.gen("boolean", "Enter"),
    },
    addHhChargeOnetime: {
      id: vS.id(),
      date: vS.dateDefaultToday(),
      householdName: vS.gen("string", "Household name"),
      householdId: vS.linkedId(
        "Household ID",
        {
          sectionName: "household",
          onDelete: "setEmpty",
        },
        {
          makeDefault: allValueAttributes.hhIdFromNameOp.makeDefault,
          validate: valS.validate.stringNotEmpty,
        }
      ),
      amount: vS.gen("number", "Amount"),
      description: vS.gen("descriptionChargeOnetime", "Description", {
        validate: (value) =>
          validateUnionValueNoEmpty(value, "descriptionChargeOnetime"),
      }),
      unitName: vS.gen("string", "Unit name", {
        makeDefault: allValueAttributes.unitNameFromHouseholdIdOp.makeDefault,
      }),
      unitId: vS.linkedId(
        "Unit ID",
        {
          sectionName: "unit",
          onDelete: "setEmpty",
        },
        {
          makeDefault: allValueAttributes.unitIdFromNameOp.makeDefault,
          validate: valS.validate.stringNotEmpty,
        }
      ),
      expenseId: vS.linkedId("Expense ID", {
        sectionName: "expense",
        onDelete: "setEmpty",
      }),
      notes: vS.gen("string", "Notes"),
      enter: vS.gen("boolean", "Enter"),
    },
    hhLeaseChargeOngoing: {
      id: vS.id(),
      householdId: vS.linkedId("Household ID", {
        sectionName: "household",
        onDelete: "delete",
      }),
      householdName: vS.gen("hhNameFromId", "Household name"),
      unitId: vS.linkedId("Unit ID", {
        sectionName: "unit",
        onDelete: "keep",
      }),
      unitName: vS.gen("unitNameFromId", "Unit name"),
      startDate: vS.gen("date", "Start date", {
        validate: valS.validate.date,
      }),
      endDate: vS.gen("date", "End date", {
        validate: valS.validate.dateOrEmpty,
        makeDefault: () => "",
      }),
      rentChange: vS.gen("yesOrNo", "Rent change"),
      rentChargeBaseMonthly: vS.gen("number", "Rent charge (base)"),
      rentChargeUtilitiesMonthly: vS.gen("number", "Rent charge (utilities)"),
      caretakerRentReduction: vS.gen("number", "Caretaker rent reduction"),
      petFeeRecurring: vS.gen("number", "Pet fee (recurring)"),
      notes: vS.gen("string", "Notes"),
    },
    scChargeOngoing: {
      id: vS.id(),
      householdId: vS.linkedId("Household ID", {
        sectionName: "household",
        onDelete: "delete",
      }),
      householdName: vS.gen("hhNameFromId", "Household name"),
      unitId: vS.linkedId("Unit ID", {
        sectionName: "unit",
        onDelete: "keep",
      }),
      unitName: vS.gen("unitNameFromId", "Unit name"),
      description: vS.gen("descriptionChargeOngoing", "Description"),
      amount: vS.gen("number", "Amount"),
      subsidyContractId: vS.linkedId("Subsidy contract ID", {
        sectionName: "subsidyContract",
        onDelete: "keep",
      }),
      subsidyContractName: vS.gen(
        "subsidyContractNameFromId",
        "Subsidy contract name"
      ),
      paymentGroupId: vS.linkedId("Payment group ID", {
        sectionName: "paymentGroup",
        onDelete: "keep",
      }),
      startDate: vS.gen("date", "Start date", {
        validate: valS.validate.date,
      }),
      endDate: vS.gen("date", "End date", {
        validate: valS.validate.dateOrEmpty,
        makeDefault: () => "",
      }),
      notes: vS.gen("string", "Notes"),
    },
    hhCharge: {
      id: vS.id(),
      date: vS.date(),
      householdName: vS.gen("hhNameFromId", "Household name"),
      householdId: vS.linkedId("Household ID", {
        sectionName: "household",
        onDelete: "delete",
      }),
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
    household: {
      id: vS.id(),
      unitId: vS.linkedId("Unit ID", {
        sectionName: "unit",
        onDelete: "setEmpty",
      }),
      utilityChargeMonthly: vS.gen("number", "Utility charge monthly"),
      utilityChargeMonthlyNext: vS.gen("number", "Next utility charge monthly"),

      rentIncreaseDateLast: vS.gen("date", "Last rent change date"),
      rentIncreaseDateNext: vS.gen("date", "Next rent change date"),
      rentChargeMonthly: vS.gen("number", "Base rent charge monthly"),
      rentChargeMonthlyNext: vS.gen("number", "Next base rent charge monthly"),
      utilityChargeNextOverride: vS.gen(
        "number",
        "Next utility charge override"
      ),
      rentChargeNextOverride: vS.gen("number", "Next rent charge override"),
      subsidyPortionMonthly: vS.gen("number", "Subsidy rent portion monthly"),
      householdPortionMonthly: vS.gen("number", "HH base rent portion monthly"),
    },
    test: {
      id: vS.id(),
      dateCurrent: vS.gen("date", "Current price date"),
      dateNext: vS.gen("date", "Next price date"),
      priceCurrent: vS.gen("number", "Current price"),
      priceNext: vS.gen("number", "Next price"),
    },
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
