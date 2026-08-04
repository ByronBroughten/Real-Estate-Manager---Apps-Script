import { Obj } from "../utils/Obj";
import { validationError } from "../utils/validation";
import { makeSchemaStructure } from "./0.1 makeSchema";
import {
  extractCellValue,
  va,
  type ValueAttributesBase,
} from "./3.0 valueAttribute";

type ValidationValuesBase = {
  readonly [key: string]: readonly string[];
};

const validationLists = makeSchemaStructure(
  {} as ValidationValuesBase,
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
    firstOfEachMonthThisYear: [
      "01-01-26",
      "02-01-26",
      "03-01-26",
      "04-01-26",
      "05-01-26",
      "06-01-26",
      "07-01-26",
      "08-01-26",
      "09-01-26",
      "10-01-26",
      "11-01-26",
      "12-01-26",
    ],
    januaryQuartersThisYear: ["01-01-26", "04-01-26", "07-01-26", "10-01-26"],
    februaryQuartersThisYear: ["02-01-26", "05-01-26", "08-01-26", "11-01-26"],
    marchQuartersThisYear: ["03-01-26", "06-01-26", "09-01-26", "12-01-26"],
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

type ValidationLists = typeof validationLists;
type ValidationName = keyof ValidationLists;

export type ValidationValues = {
  [K in ValidationName]: ValidationLists[K][number] | "";
};

export type ValidationValue<N extends ValidationName = ValidationName> =
  ValidationValues[N];

function makeDefaultValidationValue<UN extends ValidationName>(
  name: UN,
): ValidationValue<UN> {
  return validationLists[name][0] as ValidationValue<UN>;
}

function validateValidationValue<N extends ValidationName>(
  value: unknown,
  name: N,
): ValidationValue<N> {
  if (
    (validationLists[name] as readonly unknown[]).includes(value) ||
    value === ""
  ) {
    return value as ValidationValue<N>;
  } else {
    throw validationError(value, `'${name}' union value element.`);
  }
}

export function isValidationValueNoEmpty<N extends ValidationName>(
  value: unknown,
  name: N,
): value is ValidationValue<N> {
  return (validationLists[name] as readonly unknown[]).includes(value);
}

type ValidationValueAttributesBase = {
  [K in ValidationName]: ValueAttributesBase<ValidationValue<K>>;
};

export function makeValidationValueSchemas(): ValidationValueAttributesBase {
  return Obj.keys(validationLists).reduce((attributes, name) => {
    (attributes[name] as ValueAttributesBase<ValidationValue<typeof name>>) =
      va({
        type: "" as ValidationValue<typeof name>,
        makeDefault: () => makeDefaultValidationValue(name),
        defaultValidate: (value: unknown) =>
          validateValidationValue(value, name),
        extractCellValue: (colCell) => extractCellValue(colCell, "stringValue"),
        makeUserEnteredValue: (value) => ({ stringValue: value }),
      });
    return attributes;
  }, {} as ValidationValueAttributesBase);
}

export type ValidationValueParamsDict = {
  [K in ValidationName]: {};
};
