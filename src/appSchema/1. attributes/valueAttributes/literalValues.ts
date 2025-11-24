import { Obj } from "../../../utils/Obj";
import { validationError } from "../../../utils/validation";
import { va, type ValueSchema } from "../valueAttributes";

const literalValues = {
  amountAllocated: `=IF(COUNTIF(hhPaymentAllocation[Payment ID], SR("ID")), SUM(FILTER(hhPaymentAllocation[Amount], hhPaymentAllocation[Payment ID]=SR("ID"))), 0)`,
  getPaymentDate: `=ROW_MATCH(hhPayment[Date], hhPayment[ID], "Payment ID")`,
  getPaymentProcessed: `=ROW_MATCH(hhPayment[Processed], hhPayment[ID], "Payment ID")`,
  getPayer: `=ROW_MATCH(hhPayment[Payer], hhPayment[ID], "Payment ID")`,
  deductibleAmount: `=IFS(SR("Tax adjust")="", SR("Amount"), SR("Tax adjust")="Minus primary space", MINUS_PRIMARY_SPACE(SR("Amount"), SR("Property year name")), SR("Tax adjust")="Primary residence", 0, SR("Tax adjust")="Half primary residence", SR("Amount")/2, SR("Tax adjust")="Minus primary time space", MINUS_PRIMARY_TIME_SPACE(SR("Amount"), SR("Property year name")))`,
  propertyYearName: `=PROP_YEAR_NAME(SR("Property name"), YEAR(SR("Date")))`,
  payer: `=IFS(SR("Payer category")="Household", SR("Household name"), SR("Payer category")="Subsidy program", SR("Subsidy program name"), SR("Payer category")="Other payer", SR("Other payer name"), SR("Payer category")="Rent reduction", SR("Rent reduction"))`,
  paymentProcessed: `=IF(SR("Amount")=SR("Amount allocated"), IF(SR("Date")<>"",  IF(SR("Details verified")="Yes", "Yes", "No"), "No"), "No")`,
  numAllocated: `=COUNTIF(hhPaymentAllocation[Payment ID], "="&SR("ID"))`,
  householdAllocated: `=IFS(SR("Num allocated")=0, "", SR("Num allocated")>1, "Multiple", SR("Num allocated")=1, ROW_MATCH(hhPaymentAllocation[HH members full name], hhPaymentAllocation[Payment ID], "ID"))`,
  hhNameFromId: `=ROW_MATCH(household[Name], household[ID],"Household ID")`,
  hhNameFromIdOp: `=ROW_MATCH_OR_BLANK(household[Name], household[ID],"Household ID")`,
  hhIdFromNameOp: `=ROW_MATCH_OR_BLANK(household[ID], household[Name], "Household name")`,
  hhIdFromToChargeOp: `=ROW_MATCH_OR_BLANK(household[ID], household[Name], "Household to charge")`,
  paymentHhIdFromNameOp: `=ROW_MATCH_OR_BLANK(household[ID], household[Name], "Payment HH name")`,
  subsidyProgramIdFromNameOp: `=ROW_MATCH_OR_BLANK(subsidyProgram[ID], subsidyProgram[Name], "Subsidy program name")`,
  subsidyContractIdFromNameOp: `=ROW_MATCH_OR_BLANK(subsidyProgram[ID], subsidyProgram[Name], "Subsidy program name")`,
  otherPayerIdFromNameOp: `=ROW_MATCH_OR_BLANK(otherPayer[ID], otherPayer[Name], "Other payer name")`,
  unitNameFromHouseholdIdOp: `=ROW_MATCH_OR_BLANK(household[Unit name], household[ID], "Household ID")`,
  unitNameFromId: `=ROW_MATCH(unit[Name], unit[ID], "Unit ID")`,
  unitNameFromIdOp: `=ROW_MATCH_OR_BLANK(unit[Name], unit[ID], "Unit ID")`,
  unitIdFromNameOp: `=ROW_MATCH_OR_BLANK(unit[ID], unit[Name], "Unit name")`,
  propertyNameFromId: `=ROW_MATCH(property[Name], property[ID], "Property ID")`,
  propertyIdFromName: `=ROW_MATCH(property[ID], property[Name], "Property name")`,
  ledgerBalance: `=SUM_COL_TO_ROW("Charge") - SUM_COL_TO_ROW("Payment")`,
  hhMembersFullNamesFromId: `=ROW_MATCH(household[Members full name], household[ID], "Household ID")`,
  otherPayerNameFromIdOp: `=ROW_MATCH_OR_BLANK(otherPayer[Name], otherPayer[ID], "Other payer ID")`,
  subsidyContractNameFromId: `=ROW_MATCH(subsidyContract[Name], subsidyContract[ID], "Subsidy contract ID")`,
  subsidyContractNameFromIdOp: `=ROW_MATCH_OR_BLANK(subsidyContract[Name], subsidyContract[ID], "Subsidy contract ID")`,
  subsidyProgramNameFromIdOp: `=ROW_MATCH_OR_BLANK(subsidyProgram[Name], subsidyProgram[ID], "Subsidy program ID")`,
  petNameFromIdOp: `=ROW_MATCH_OR_BLANK(pet[Name], pet[ID], "Pet ID")`,
};

export type LiteralValues = typeof literalValues;
type LiteralValueName = keyof LiteralValues;

type LiteralValue<LN extends LiteralValueName> = LiteralValues[LN];

type LiteralValueAttributesBase = {
  [K in LiteralValueName]: ValueSchema<LiteralValue<K>>;
};

export function makeLiteralValueSchemas(): LiteralValueAttributesBase {
  return Obj.keys(literalValues).reduce((attributes, name) => {
    attributes[name] = va({
      type: literalValues[name] as LiteralValue<typeof name>,
      makeDefault: () => literalValues[name],
      defaultValidate: (value: unknown) => {
        if (value !== literalValues[name]) {
          throw validationError(value, `'${name}' literal value element.`);
        } else {
          return value;
        }
      },
    });
    return attributes;
  }, {} as LiteralValueAttributesBase);
}

export type LiteralValueParamsDict = {
  [K in LiteralValueName]: {};
};
