import { Spreadsheet } from "./StateHandlers/Spreadsheet";

// export function trigger(e) {
//   const addOnetimeChargeRange = asU.range.getNamed("apiAddOnetimeChargeEnter");
//   if (e.range.getA1Notation() === addOnetimeChargeRange.getA1Notation()) {
//     handleAddOnetimeCharge();
//     addOnetimeChargeRange.setValue(false);
//   }
// }

export function test() {}

export const api = {
  monthlyRentUpdate() {},
  addHhOnetimeCharge() {
    const ss = Spreadsheet.init();

    const sAddOnetime = ss.sheet("addHhChargeOnetime");
    const rAddOnetime = sAddOnetime.topBodyRow;
    const values = rAddOnetime.validateValues();

    const sOnetime = ss.sheet("hhChargeOnetime");
    sOnetime.addRowWithValues(values);
    ss.batchUpdateRanges();
  },
  updateRentPortions() {
    const ss = Spreadsheet.init();
  },
};
