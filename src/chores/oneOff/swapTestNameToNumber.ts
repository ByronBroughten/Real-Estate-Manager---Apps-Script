import type { Chore } from "../Chore";

export const swapTestNameToNumber: Chore = {
  description:
    "Points the Test sheet's Name formula at the Number column instead of the ID column, to prove a findReplace rewrites a table reference in place.",
  action: (ss) => {
    const column = ss.sheet("test").prepFetchColumnsFull("name").name;
    ss.fetchAllPrepped();
    const before = column.valueArrOrEmpty;
    column.findReplace({
      find: "SINGLE(test[ID])",
      replacement: "SINGLE(test[Number])",
      matchCase: true,
      includeFormulas: true,
    });
    ss.batchUpdateGSheets();
    return `${before.length} Name cell(s) before the swap: ${before.join(", ")}`;
  },
};
