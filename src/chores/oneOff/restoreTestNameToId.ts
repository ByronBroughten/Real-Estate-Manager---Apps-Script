import type { Chore } from "../Chore";

export const restoreTestNameToId: Chore = {
  description:
    "Points the Test sheet's Name formula back at the ID column, undoing swapTestNameToNumber.",
  action: (ss) => {
    const column = ss.sheet("test").prepFetchColumnsFull("name").name;
    ss.fetchAllPrepped();
    const before = column.valueArrOrEmpty;
    column.findReplace({
      find: "SINGLE(test[Number])",
      replacement: "SINGLE(test[ID])",
      matchCase: true,
      includeFormulas: true,
    });
    ss.batchUpdateGSheets();
    return `${before.length} Name cell(s) before the restore: ${before.join(", ")}`;
  },
};
