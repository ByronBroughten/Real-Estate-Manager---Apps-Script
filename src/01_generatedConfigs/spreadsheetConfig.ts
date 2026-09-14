import { makeSpreadsheetConfig } from "./makeConfigs";

export const spreadsheetConfig = makeSpreadsheetConfig({
  idDelimiter: ":",
  nameDelimiter: "`",
  idHeader: "ID",
  startTableColIndexBase0: 0,
  columnIdRowIdxBase0: 0,
  columnGroupHeadingRowIndexBase0: 1,
  actionRowIndexBase0: 2,
  headerRowIndexBase0: 3,
  topDataRowIdxBase0: 4,
} as const);
