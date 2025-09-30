import { Spreadsheet } from "./Spreadsheet";

// export function trigger(e) {
//   const addOnetimeChargeRange = asU.range.getNamed("apiAddOnetimeChargeEnter");
//   if (e.range.getA1Notation() === addOnetimeChargeRange.getA1Notation()) {
//     handleAddOnetimeCharge();
//     addOnetimeChargeRange.setValue(false);
//   }
// }

export const api = {
  addHhOnetimeCharge() {
    const ss = Spreadsheet.init();

    const sAddOnetime = ss.sheet("addHhChargeOnetime");
    const rAddOnetime = sAddOnetime.topBodyRow;
    const values = rAddOnetime.validateValues();

    const sOnetime = ss.sheet("hhChargeOnetime");
    sOnetime.addRowWithValues(values);
    ss.pushAllChanges();
    // Probably I'm just going to append the row.
    // I can append multiple rows.
    // I think I can do two types of operations: col and row (multi of each).

    // In the state I can  track  section rows to append.
    // And I can track columns to update.
  },
};
