export const valueNames = [
  "id",
  "boolean",
  "buildingType",
  "buildingTypeAndAny",
  "chargeDescription",
  "chargeOnetimeDescription",
  "chargeReduceDescription",
  "date",
  "expenseCategory",
  "number",
  "oneOccupancyOrAll",
  "payerCategory",
  "paymentAllocateWhat",
  "paymentType",
  "receiptFormat",
  "rentPortionName",
  "residenceTaxAdjust",
  "string",
  "yesOrNo",
] as const;

export type ValueNameSimple = (typeof valueNames)[number];
