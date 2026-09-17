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
    return "Queued an edit warning on test ID unless an identical protection was already present.";
  },
};
