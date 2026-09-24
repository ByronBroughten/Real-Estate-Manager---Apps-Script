import { columnConfigs } from "./generated/columnConfigs";
import { sheetConfigs } from "./generated/sheetConfigs";
import { spreadsheetConfig } from "./generated/spreadsheetConfig";
import { valueConfigs } from "./generated/valueConfigs";

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
