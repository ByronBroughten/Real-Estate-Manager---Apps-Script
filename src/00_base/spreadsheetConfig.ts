export const spreadsheetConfig = {
  idDelimiter: ":",
  idHeader: "ID",
  startTableColIndex: 0,
  columnIdRowIdxBase0: 0,
  columnGroupRowIdxBase0: 1,
  actionRowIndexBase0: 2,
  headerRowIndexBase0: 3,
  topDataRowIdxBase0: 4,
  firstDataColIndexBase0: 0,
  spreadsheetConfigGid: 1967106628,
  sheetConfigGid: 210603630,
  columnConfigGid: 2034522667,
  valueConfigGid: 2119236084,
} as const;

export type SpreadsheetConfig = typeof spreadsheetConfig;
export function configGet<K extends keyof SpreadsheetConfig>(
  key: K,
): SpreadsheetConfig[K] {
  return spreadsheetConfig[key];
}
