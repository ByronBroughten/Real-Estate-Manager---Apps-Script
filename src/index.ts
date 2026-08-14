import { SpreadsheetRawBase } from "./02_AppsScriptRaw/ClassBases/SpreadsheetRawBase.js";
import { SheetConfigRaw } from "./02_AppsScriptRaw/SpecificSheetRaw/SheetConfigRaw.js";
import { Api } from "./Api.js";
import { TopOperator } from "./TopOperator.js";

function generateSheetTraitsFile(): string {
  const sheetConfig = new SheetConfigRaw({
    rawState: SpreadsheetRawBase.initRawState(),
  });
  return sheetConfig.generateSheetTraitsFileSource();
}

function triggerFirstOfMonth() {
  const top = TopOperator.init();
  top.monthlyRentUpdate();
}

function triggerOnEdit(e: GoogleAppsScript.Events.SheetsOnEdit) {
  const api = new Api();
  api.handleSheetOnEditEvent(e);
}

function testUpdateLeaseOngoingCharges() {
  const top = TopOperator.init();
  top.leaseMgmt.doPeriodicLeaseUpdates();
  top.ss.raw.batchUpdateGSheets();
}

function testUpdateSubsidyOngoingCharges() {
  const top = TopOperator.init();
  top.subsidyMgmt.doPeriodicSubsidyUpdates();
  top.ss.raw.batchUpdateGSheets();
}

function testBuildOutMonthlyChargesAndPayments() {
  const top = TopOperator.init();
  // const cfp = top.buildOutChargesForMonth();
  // top.buildOutPaymentsFromCharges(cfp);
  top.ss.raw.batchUpdateGSheets();
}
