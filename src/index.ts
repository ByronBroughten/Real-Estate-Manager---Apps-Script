import { TopOperator } from "./TopOperator.js";
import { asU } from "./utilitiesAppsScript.js";

function triggerFirstOfMonth() {
  const top = TopOperator.init();
  top.monthlyRentUpdate();
}

function buildOutCharges() {
  const top = TopOperator.init();
  top.buildOutCharges();
}

function buildHhLedger() {
  const top = TopOperator.init();
  top.buildHhLedger();
}

// function buildOutPayments() {
//   const top = TopOperator.init();
//   top.buildOutPayments();
// }

function triggerOnEdit(e: GoogleAppsScript.Events.SheetsOnEdit) {
  if (e.value === "TRUE") {
    const sheetId = e.range.getSheet().getSheetId();
    const colId = e.range.getColumn();
    const rowId = e.range.getRow();
    const top = TopOperator.init();
    if (top.isEnterValue(sheetId, colId, rowId)) {
      const { sectionName } = top.sectionsSchema.sectionBySheetId(sheetId);
      if (sectionName === "addHhChargeOnetime") {
        top.addHhChargeOnetime();
      } else if (sectionName === "buildHhLedger") {
        top.buildHhLedger();
      }
    }
  }
}

function addHhChargeOnetime() {
  const top = TopOperator.init();
  top.addHhChargeOnetime();
}

function resetTriggers(doResetTriggers: boolean = true) {
  if (doResetTriggers) {
    const top = TopOperator.init();
    top.test();
    asU.trigger.deleteAll();
    asU.trigger.addFirstOfMonth("triggerFirstOfMonth");
    asU.trigger.addOnEdit("triggerOnEdit");
  }
}

resetTriggers(false);
