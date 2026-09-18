import { makeSpreadsheetConfig } from "../makeConfigs";

export const spreadsheetConfig = makeSpreadsheetConfig({
  idDelimiter: ":",
  idHeader: "ID",
  startTableColIndexBase0: 0,
  columnIdRowIdxBase0: 0,
  columnGroupHeadingRowIndexBase0: 1,
  actionRowIndexBase0: 2,
  tableHeaderRowIndexBase0: 3,
} as const);
