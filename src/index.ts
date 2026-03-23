import { ApiOperator } from "./TopOperator.js";
import { asU } from "./utilitiesAppsScript.js";

function triggerFirstOfMonth() {
  const top = ApiOperator.init();
  top.monthlyRentUpdate();
}

function triggerOnEdit(e: GoogleAppsScript.Events.SheetsOnEdit) {
  if (e.value === "TRUE") {
    const top = ApiOperator.init();
    top.onTrueValueEntered(e);
  }
}

function resetTriggers(doResetTriggers: boolean = true) {
  if (doResetTriggers) {
    const top = ApiOperator.init();
    top.test();
    asU.trigger.deleteAll();
    asU.trigger.addFirstOfMonth("triggerFirstOfMonth");
    asU.trigger.addOnEdit("triggerOnEdit");
  }
}

resetTriggers(false);

function testUpdateLeaseOngoingCharges() {
  const top = ApiOperator.init();
  top.leaseMgmt.doPeriodicLeaseUpdates();
  top.ss.batchUpdateRanges();
}

function testUpdateSubsidyOngoingCharges() {
  const top = ApiOperator.init();
  top.subsidyMgmt.doPeriodicSubsidyUpdates();
  top.ss.batchUpdateRanges();
}

function testBuildOutMonthlyChargesAndPayments() {
  const top = ApiOperator.init();
  // const cfp = top.buildOutChargesForMonth();
  // top.buildOutPaymentsFromCharges(cfp);
  top.ss.batchUpdateRanges();
}
