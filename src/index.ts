import { TopOperator } from "./TopOperator.js";
import { asU } from "./utilitiesAppsScript.js";

function triggerFirstOfMonth() {
  const top = TopOperator.init();
  top.monthlyRentUpdate();
}

function buildOutChargesFromRecurring() {
  const top = TopOperator.init();
  top.buildOutChargesFromRecurring();
}

function triggerOnEdit(e: GoogleAppsScript.Events.SheetsOnEdit) {
  if (e.value === "TRUE") {
    const sheetId = e.range.getSheet().getSheetId();
    const colId = e.range.getColumn();
    const rowId = e.range.getRow();
    const top = TopOperator.init();
    if (top.isEnterValue(sheetId, colId, rowId)) {
      top.addHhOnetimeCharge();
    }
  }
}

function addHhOnetimeCharge() {
  const top = TopOperator.init();
  top.addHhOnetimeCharge();
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
