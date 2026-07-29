export const spreadsheetConfig = {
  headerRowIdxBase1: 3,
  topBodyRowIdxBase1: 4,
  columnIdRowIdxBase1: 2,
  headerRowIdxBase0: 2,
  topBodyRowIdxBase0: 3,
  columnIdRowIdxBase0: 1,
  idDelimiter: "-",
  activePaymentStandardYear: 2026,
  domLateFeeCharged: 6,
} as const;

export type SpreadsheetConfig = typeof spreadsheetConfig;
export function configGet<K extends keyof SpreadsheetConfig>(
  key: K,
): SpreadsheetConfig[K] {
  return spreadsheetConfig[key];
}
