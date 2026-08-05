export const spreadsheetConfig = {
  idDelimiter: ":",
  columnIdRowIdxBase0: 0,
  actionRowIdxBase0: 2,
  headerRowIdxBase0: 3,
  topBodyRowIdxBase0: 4,
  activePaymentStandardYear: 2026,
  domLateFeeCharged: 6,
} as const;

export type SpreadsheetConfig = typeof spreadsheetConfig;
export function configGet<K extends keyof SpreadsheetConfig>(
  key: K,
): SpreadsheetConfig[K] {
  return spreadsheetConfig[key];
}
