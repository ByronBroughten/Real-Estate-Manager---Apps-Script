import { Obj } from "../../../utils/Obj";
import { validationError } from "../../../utils/validation";
import { va, type ValueSchema } from "../valueAttributes";

const literalValues = {
  amountAllocated: `=IF(COUNTIF(hhPaymentAllocation[Payment ID], SAME_ROW("ID")), SUM(FILTER(hhPaymentAllocation[Amount], hhPaymentAllocation[Payment ID]=SAME_ROW("ID"))), 0)`,
  getPaymentDate: `=ROW_MATCH(hhPayment[Date], hhPayment[ID], "Payment ID")`,
  getPaymentProcessed: `=ROW_MATCH(hhPayment[Processed], hhPayment[ID], "Payment ID")`,
  getPayer: `=ROW_MATCH(hhPayment[Payer], hhPayment[ID], "Payment ID")`,
  payer: `=IFS(SAME_ROW("Payer category")="Household", "Household", SAME_ROW("Payer category")="Subsidy program", SAME_ROW("Subsidy program name"), SAME_ROW("Payer category")="Other payer", SAME_ROW("Other payer name"))`,
  paymentProcessed: `=IF(SAME_ROW("Amount")=SAME_ROW("Allocated amount"), IF(SAME_ROW("Date")<>"",  IF(SAME_ROW("Details verified")="Yes", "Yes", "No"), "No"), "No")`,
  numAllocated: `=COUNTIF(hhPaymentAllocation[Payment ID], "="&SAME_ROW("ID"))`,
  householdAllocated: `=IFS(SAME_ROW("Num allocated")=0, "", SAME_ROW("Num allocated")>1, "multiple", SAME_ROW("Num allocated")=1, ROW_MATCH(hhPaymentAllocation[HH members full name], hhPaymentAllocation[Payment ID], "ID"))`,
  hhNameFromId: `=ROW_MATCH(household[Name], household[ID],"Household ID")`,
  hhNameFromIdOp: `=ROW_MATCH_OR_BLANK(household[Name], household[ID],"Household ID")`,
  hhIdFromNameOp: `=ROW_MATCH_OR_BLANK(household[ID], household[Name], "Household name")`,
  paymentHhIdFromNameOp: `=ROW_MATCH_OR_BLANK(household[ID], household[Name], "Payment HH name")`,
  subsidyProgramIdFromNameOp: `=ROW_MATCH_OR_BLANK(subsidyProgram[ID], subsidyProgram[Name], "Subsidy program name")`,
  subsidyContractIdFromNameOp: `=ROW_MATCH_OR_BLANK(subsidyProgram[ID], subsidyProgram[Name], "Subsidy program name")`,
  otherPayerIdFromNameOp: `=ROW_MATCH_OR_BLANK(otherPayer[ID], otherPayer[Name], "Other payer name")`,
  unitNameFromHouseholdIdOp: `=ROW_MATCH_OR_BLANK(household[Unit name], household[ID], "Household ID")`,
  unitNameFromId: `=ROW_MATCH(unit[Name], unit[ID], "Unit ID")`,
  unitIdFromNameOp: `=ROW_MATCH_OR_BLANK(unit[ID], unit[Name], "Unit name")`,
  ledgerBalance: `=SUM_COL_TO_ROW("Charge") - SUM_COL_TO_ROW("Payment")`,
  hhMembersFullNamesFromId: `=ROW_MATCH(household[Members full name], household[ID], "Household ID")`,
  otherPayerNameFromIdOp: `=ROW_MATCH_OR_BLANK(otherPayer[Name], otherPayer[ID], "Other payer ID")`,
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
