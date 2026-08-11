import {
  extractCellValue,
  vsc,
  type ValueSchemaBase,
} from "../2.0 Schemas/3.0 valueSchema";
import { Obj } from "../utils/Obj";
import { validationError } from "../utils/validation";
import { makeStructuredConfig } from "./0.0 ConfigPrecursors";

type CellListValuesBase = {
  readonly [key: string]: readonly string[];
};

const valueConfig = makeStructuredConfig(
  {} as CellListValuesBase,
  {
    sheetConfigHeader: ["Sheet GID", "Sheet name camel case", "ID prefix"],
    configColumnHeader: [
      "ID",
      "Table name",
      "Camel case header",
      "Column ID",
      "Column index base 0",
      "Header",
      "Is formula",
      "Value name",
      "Is api status and run",
      "Custom default value",
      "Empty allowed",
    ],
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

export type ValueConfig = typeof valueConfig;
export type ValueConfigKey = keyof ValueConfig;
export const valueConfigKeys: readonly ValueConfigKey[] = Obj.keys(valueConfig);

export type ValueConfigValue<N extends ValueConfigKey> = ValueConfig[N][number];

export function valueConfigGet<VN extends keyof ValueConfig>(
  name: VN,
): ValueConfig[VN] {
  return valueConfig[name];
}

export type CellListValues = {
  [K in ValueConfigKey]: ValueConfig[K][number];
};
export type CellListValue<N extends ValueConfigKey = ValueConfigKey> =
  CellListValues[N];

function makeDefaultValidationValue<UN extends ValueConfigKey>(
  name: UN,
): CellListValue<UN> {
  return valueConfig[name][0] as CellListValue<UN>;
}

function validateValidationValue<N extends ValueConfigKey>(
  value: unknown,
  name: N,
): CellListValue<N> {
  if ((valueConfig[name] as readonly unknown[]).includes(value)) {
    return value as CellListValue<N>;
  } else {
    throw validationError(value, `'${name}' union value element.`);
  }
}

export function isValidationValueNoEmpty<N extends ValueConfigKey>(
  value: unknown,
  name: N,
): value is CellListValue<N> {
  return (valueConfig[name] as readonly unknown[]).includes(value);
}

type StringValueSchemasBase = {
  [K in ValueConfigKey]: ValueSchemaBase<CellListValue<K>>;
};

export function makeCellListValueschemas(): StringValueSchemasBase {
  return Obj.keys(valueConfig).reduce((attributes, name) => {
    (attributes[name] as ValueSchemaBase<CellListValue<typeof name>>) = vsc({
      type: makeDefaultValidationValue(name) as CellListValue<typeof name>,
      makeDefault: () => makeDefaultValidationValue(name),
      strictValidate: (value: unknown) => validateValidationValue(value, name),
      extractCellValue: (colCell) => extractCellValue(colCell, "stringValue"),
      makeUserEnteredValue: (value) => ({ stringValue: value }),
    }) as ValueSchemaBase<CellListValue<typeof name>>;
    return attributes;
  }, {} as StringValueSchemasBase);
}

export type ValidationValueParamsDict = {
  [K in ValueConfigKey]: {};
};
