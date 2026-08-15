import { makeStructuredConfig } from "../00_base/base";
import { Obj } from "../utils/Obj";

const valueTraits = makeStructuredConfig(
  {} as Record<string, readonly string[]>,
  {
    transactionDescription: [
      "Rent (base)",
      "Rent (utilities)",
      "Pet fee (recurring)",
      "Caretaker rent reduction",
      "Security deposit",
      "Late fee",
      "Damage, waste, or service",
      "Forgiveness",
    ],
    chargeDescription: [
      "Rent (base)",
      "Rent (utilities)",
      "Pet fee (recurring)",
      "Caretaker rent reduction",
      "Security deposit",
      "Late fee",
      "Damage, waste, or service",
      "Forgiveness",
    ],
    chargeRecurringDescription: [
      "Rent (base)",
      "Rent (utilities)",
      "Pet fee (recurring)",
      "Caretaker rent reduction",
    ],
    chargeOnetimeDescription: [
      "Security deposit",
      "Late fee",
      "Damage, waste, or service",
      "Forgiveness",
    ],
    chargeReduceDescription: ["Forgiveness", "Security deposit"],
    rentPortionName: ["Household", "Subsidy program"],
    paymentType: ["Currency", "Caretaking"],
    payerCategory: ["Household", "Non-resident"],
    paymentAllocateWhat: ["Full payment", "Full charge", "Lesser amount"],
    expenseCategory: [
      "Repair",
      "Supplies",
      "Cleaning & maintenance",
      "Depreciation expense or depletion",
      "Utilities",
      "Insurance",
      "Taxes",
      "Mortgage interest paid to banks",
      "Legal & professional",
      "Advertising",
      "Auto and travel",
      "Mgmt fees",
      "Commissions",
      "Other interest",
      "Other",
      "Principal",
    ],
    expenseCategoryTaxable: [
      "Repair",
      "Supplies",
      "Cleaning & maintenance",
      "Depreciation expense or depletion",
      "Utilities",
      "Insurance",
      "Taxes",
      "Mortgage interest paid to banks",
      "Legal & professional",
      "Advertising",
      "Auto and travel",
      "Mgmt fees",
      "Commissions",
      "Other interest",
      "Other",
    ],
    expenseCategoryBank: [
      "Insurance",
      "Taxes",
      "Mortgage interest paid to banks",
      "Principal",
    ],
    residenceTaxAdjust: [
      "Minus primary space",
      "Primary residence",
      "Half primary residence",
      "Minus primary time space",
    ],
    receiptFormat: [
      "Electronic",
      "Physical",
      "Cash ledger",
      "Text message",
      "Biller website",
      "Email",
      "Cash App",
      "Venmo",
      "Unknown",
    ],
    yesOrNo: ["Yes", "No"],
    oneOccupancyOrAll: ["One occupancy", "All"],
    buildingType: [
      "Small multifamily",
      "Single family home",
      "Apartment building",
    ],
    buildingTypeAndAny: [
      "Small multifamily",
      "Single family home",
      "Apartment building",
      "Any",
    ],
  } as const,
);

type ValueTraits = typeof valueTraits;
export type ValueTraitName = keyof ValueTraits;
export const valueTraitNames: readonly ValueTraitName[] = Obj.keys(valueTraits);

export type ValueTraitValues = {
  [K in ValueTraitName]: ValueTraits[K][number];
};
export type ValueTraitValue<N extends ValueTraitName = ValueTraitName> =
  ValueTraitValues[N];

export function getValueTraitValueArr<K extends ValueTraitName>(
  key: K,
): ValueTraits[K] {
  return valueTraits[key];
}
