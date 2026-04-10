import { TopOperator } from "./TopOperator.js";
import { asU } from "./utilitiesAppsScript.js";

function triggerFirstOfMonth() {
  const top = TopOperator.init();
  top.monthlyRentUpdate();
}

function triggerOnEdit(e: GoogleAppsScript.Events.SheetsOnEdit) {
  if (e.value === "TRUE") {
    const api = TopOperator.init();
    api.onTrueValueEntered(e);
  }
}

function resetTriggers(doResetTriggers: boolean = true) {
  if (doResetTriggers) {
    const api = TopOperator.init();
    api.test();
    asU.trigger.deleteAll();
    asU.trigger.addFirstOfMonth("triggerFirstOfMonth");
    asU.trigger.addOnEdit("triggerOnEdit");
  }
}

resetTriggers(false);

function testUpdateLeaseOngoingCharges() {
  const api = TopOperator.init();
  api.leaseMgmt.doPeriodicLeaseUpdates();
  api.ss.batchUpdateRanges();
}

function testUpdateSubsidyOngoingCharges() {
  const api = TopOperator.init();
  api.subsidyMgmt.doPeriodicSubsidyUpdates();
  api.ss.batchUpdateRanges();
}

function testBuildOutMonthlyChargesAndPayments() {
  const api = TopOperator.init();
  // const cfp = api.buildOutChargesForMonth();
  // api.buildOutPaymentsFromCharges(cfp);
  api.ss.batchUpdateRanges();
}
