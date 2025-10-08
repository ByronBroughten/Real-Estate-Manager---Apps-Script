import { TopOperator } from "./TopOperator.js";
import { asU } from "./utilitiesAppsScript.js";

function triggerFirstOfMonth() {
  const top = TopOperator.init();
  top.monthlyRentUpdate();
}

function triggerOnEdit(e: GoogleAppsScript.Events.SheetsOnEdit) {
  console.log(e.value);
  if (e.value === "TRUE") {
    const sheetId = e.range.getSheet().getSheetId();
    Logger.log("The spreadsheet ID is: " + sheetId);

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
    asU.trigger.deleteAll();
    asU.trigger.addFirstOfMonth("triggerFirstOfMonth");
    asU.trigger.addOnEdit("triggerOnEdit");
  }
}

resetTriggers(false);
