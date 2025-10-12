import { TopOperator } from "./TopOperator.js";

function triggerFirstOfMonth() {
  const top = TopOperator.init();
  top.monthlyRentUpdate();
}

function triggerOnEditCustom(e: GoogleAppsScript.Events.SheetsOnEdit) {
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

function resetTriggers(doResetTriggers: boolean = true) {
  if (doResetTriggers) {
    const top = TopOperator.init();
    top.test();
    // asU.trigger.deleteAll();
    // asU.trigger.addFirstOfMonth("triggerFirstOfMonth");
    // asU.trigger.addOnEdit("triggerOnEditCustom");
  }
}

resetTriggers(false);
