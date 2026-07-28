export const spreadsheetConfig = {
  headerRowIdxBase1: 3,
  topBodyRowIdxBase1: 4,
  columnIdRowIdxBase1: 2,
  idDelimiter: "-",
  activePaymentStandardYear: 2026,
  domLateFeeCharged: 6,
} as const;

export type SpreadsheetConfig = typeof spreadsheetConfig;
export function getSpreadsheetConfigAttr<K extends keyof SpreadsheetConfig>(
  key: K,
): SpreadsheetConfig[K] {
  return spreadsheetConfig[key];
}
