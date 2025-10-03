import { asU } from "./utilitiesAppsScript";

// export function trigger(e) {
//   const addOnetimeChargeRange = asU.range.getNamed("apiAddOnetimeChargeEnter");
//   if (e.range.getA1Notation() === addOnetimeChargeRange.getA1Notation()) {
//     handleAddOnetimeCharge();
//     addOnetimeChargeRange.setValue(false);
//   }
// }

export function setMonthlyRentUpdateTrigger() {
  asU.trigger.addFirstOfMonth("monthlyRentUpdate");
}
