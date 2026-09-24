import { columnConfigs } from "./01_SpreadsheetSchema/generated/columnConfigs";
import { sheetConfigs } from "./01_SpreadsheetSchema/generated/sheetConfigs";
import { spreadsheetConfig } from "./01_SpreadsheetSchema/generated/spreadsheetConfig";
import { valueConfigs } from "./01_SpreadsheetSchema/generated/valueConfigs";

export const appConfigs = {
  spreadsheetConfig,
  sheetConfigs,
  columnConfigs,
  valueConfigs,
};

declare module "@byronbroughten/sheets-framework" {
  interface Register {
    configs: typeof appConfigs;
  }
}
