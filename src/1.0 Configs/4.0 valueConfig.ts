import { Obj } from "../utils/Obj";
import { makeStructuredConfig } from "./0.0 ConfigPrecursors";

const valueConfig = makeStructuredConfig(
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

type ValueConfig = typeof valueConfig;
export type ConfigValueName = keyof ValueConfig;
export const configValueNames: readonly ConfigValueName[] =
  Obj.keys(valueConfig);

export type ValueConfigValues = {
  [K in ConfigValueName]: ValueConfig[K][number];
};
export type ValueConfigValue<N extends ConfigValueName = ConfigValueName> =
  ValueConfigValues[N];

export function getValueConfigValueArr<K extends ConfigValueName>(
  key: K,
): ValueConfig[K] {
  return valueConfig[key];
}
