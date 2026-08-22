import { msc } from "./sheetConfigBuilder";
import { makeSheetConfigs } from "./sheetConfigs";

export const baseSheetConfigs = makeSheetConfigs({
  spreadsheetConfig: msc(1967106628, "vrb"),
  sheetConfig: msc(210603630, "stm"),
  columnConfig: msc(2034522667, "scm"),
  valueConfig: msc(2119236084, "vcf"),
  spreadsheetControls: msc(1971630928, "sct"),
  test: msc(2089200354, "tst", true),
});
