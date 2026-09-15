import type { Chore } from "../Chore";

export const stampTestFormulaTest: Chore = {
  description:
    "Stamps =2+SINGLE(test[Number]) onto every Formula test data row on Test.",
  action: (ss) => {
    ss.fetchAllSheetProperties();
    ss.sheetMeta("test").uniformRow("columnId").prepFetchFull();
    ss.fetchAllPrepped({ skipFetchingProperties: true });
    ss.sheet("test")
      .column("formulaTest")
      .updateAllFormulas("=2+SINGLE(test[Number])");
    ss.batchUpdateGSheets();
  },
};
