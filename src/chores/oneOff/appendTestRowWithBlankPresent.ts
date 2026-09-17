import type { Chore } from "../Chore";

export const appendTestRowWithBlankPresent: Chore = {
  description:
    "Appends one complete row to Test so we can see what the write does when a blank row already sits in the table.",
  action: (ss) => {
    const sheet = ss.sheet("test");
    sheet.prepFetchColumnsFull(
      "id",
      "num",
      "dropdown",
      "conditionalFormatting",
      "columnCurrency",
      "active",
    );
    ss.fetchAllPrepped();
    const blankRowIndexes = sheet.raw.rowIndexesFull.filter(
      (rowIndex) => sheet.row(rowIndex).isBlank,
    );
    const row = sheet.appendRowWithAllVals({
      num: 7,
      dropdown: "Yes",
      conditionalFormatting: true,
      columnCurrency: 8,
      active: true,
    });
    ss.batchUpdateGSheets();
    return `Blank rowIndexes before append: [${blankRowIndexes.join(", ")}]. Append filled rowIndex ${row.rowIndex}.`;
  },
};
