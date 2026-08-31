import { makeSpreadsheetConfig } from "./makeConfigs";

export const spreadsheetConfig = makeSpreadsheetConfig({
  idDelimiter: ":",
  idHeader: "ID",
  columnIdRowIdxBase0: 0,
  columnGroupRowIdxBase0: 1,
  actionRowIndexBase0: 2,
  headerRowIndexBase0: 3,
  topDataRowIdxBase0: 4,
  startTableColIndexBase0: 0,
} as const);
