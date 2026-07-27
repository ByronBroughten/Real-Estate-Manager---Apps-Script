import { TopOperator } from "./TopOperator.js";

function triggerFirstOfMonth() {
  const top = TopOperator.init();
  top.monthlyRentUpdate();
}

function triggerOnEdit(e: GoogleAppsScript.Events.SheetsOnEdit) {
  if (e.value === "TRUE") {
    const top = TopOperator.init();
    top.onTrueValueEntered(e);
  }
}

function testUpdateLeaseOngoingCharges() {
  const top = TopOperator.init();
  top.leaseMgmt.doPeriodicLeaseUpdates();
  top.ss.gatherRequestsAndBatchUpdate();
}

function testUpdateSubsidyOngoingCharges() {
  const top = TopOperator.init();
  top.subsidyMgmt.doPeriodicSubsidyUpdates();
  top.ss.gatherRequestsAndBatchUpdate();
}

function testBuildOutMonthlyChargesAndPayments() {
  const top = TopOperator.init();
  // const cfp = top.buildOutChargesForMonth();
  // top.buildOutPaymentsFromCharges(cfp);
  top.ss.gatherRequestsAndBatchUpdate();
}
