import type { Chore } from "../Chore";

export const previewTestSheetEditWarning: Chore = {
  description:
    "Queues an edit warning over the test sheet's ID column so a dry-run preview shows a protection write.",
  action: (ss) => {
    const sheet = ss.sheet("test");
    sheet.prepFetchProtectedRanges();
    ss.fetchAllPrepped();
    sheet.column("id").addEditWarning({
      description: "Framework preview · test · ID · warning",
    });
    ss.batchUpdateGSheets();
    return "Asked for an edit warning on test ID; an empty report means an identical protection already exists.";
  },
};
