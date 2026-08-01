export const spreadsheetConfig = {
  // base 0
  topFetchRowIdx: 0,
  columnIdRowIdx: 1,
  headerRowIdx: 2,
  topBodyRowIdx: 3,

  headerRowIdxBase0: 2,
  topBodyRowIdxBase0: 3,
  columnIdRowIdxBase0: 1,
  topFetchRowIdxBase0: 1,
  headerRowIdxBase1: 3,
  topBodyRowIdxBase1: 4,
  columnIdRowIdxBase1: 2,
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
