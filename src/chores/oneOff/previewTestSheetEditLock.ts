import type { Chore } from "../Chore";

export const previewTestSheetEditLock: Chore = {
  description:
    "Queues an edit lock naming no editors over the test sheet's num column, so a read-back shows which editors Google fills in.",
  action: (ss) => {
    const sheet = ss.sheet("test");
    sheet.prepFetchProtectedRanges();
    ss.fetchAllPrepped();
    sheet.column("num").addEditLock({
      description: "Framework preview · test · num · lock",
    });
    ss.batchUpdateGSheets();
    return "Asked for an edit lock on test num; an empty report means an identical protection already exists.";
  },
};
