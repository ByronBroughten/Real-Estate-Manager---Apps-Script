import { isInSnGroup } from "./appSchema/1. attributes/sectionAttributes.js";
import type { SectionValues } from "./appSchema/1. attributes/varbAttributes.js";
import { ApiOperator } from "./TopOperator.js";
import { asU } from "./utilitiesAppsScript.js";

function triggerFirstOfMonth() {
  const top = ApiOperator.init();
  top.monthlyRentUpdate();
}

function triggerOnEdit(e: GoogleAppsScript.Events.SheetsOnEdit) {
  if (e.value === "TRUE") {
    const sheetId = e.range.getSheet().getSheetId();
    const top = ApiOperator.init();
    const { sectionName } = top.ss.sectionsSchema.sectionBySheetId(sheetId);
    if (!isInSnGroup("api", sectionName)) {
      return;
    }

    const colIdxBase1 = e.range.getColumn();
    const rowIdxBase1 = e.range.getRow();
    const sheet = top.sheet(sectionName);

    if (sheet.isApiEnterTriggered({ colIdxBase1, rowIdxBase1 })) {
      const apiRow = sheet.topBodyRow;
      const apiValues = apiRow.validateValues();

      apiRow.resetToDefault();
      top.batchUpdateRanges();

      try {
        top.apiFunctions[sectionName](
          apiValues as SectionValues<typeof sectionName> as any,
        );
      } catch (e) {
        console.error(e);
        apiRow.setValues(apiValues);
        top.ss.batchUpdateRanges();
      }
    }
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
