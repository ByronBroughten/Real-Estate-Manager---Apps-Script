import { isInSnGroup } from "./appSchema/1. attributes/sectionAttributes.js";
import type { SectionValues } from "./appSchema/1. attributes/varbAttributes.js";
import { TopOperator } from "./TopOperator.js";
import { asU } from "./utilitiesAppsScript.js";

function triggerFirstOfMonth() {
  const top = TopOperator.init();
  top.monthlyRentUpdate();
}

function triggerOnEdit(e: GoogleAppsScript.Events.SheetsOnEdit) {
  if (e.value === "TRUE") {
    const sheetId = e.range.getSheet().getSheetId();
    const top = TopOperator.init();
    const { sectionName } = top.sectionsSchema.sectionBySheetId(sheetId);
    if (!isInSnGroup("api", sectionName)) {
      return;
    }

    const colIdx = e.range.getColumn();
    const rowIdx = e.range.getRow();
    const sheet = top.ss.sheet(sectionName);

    if (sheet.isApiEnterTriggered({ colIdx, rowIdx })) {
      const apiRow = sheet.topBodyRow;
      const apiValues = apiRow.validateValues();

      apiRow.resetToDefault();
      top.ss.batchUpdateRanges();

      try {
        top[sectionName](apiValues as SectionValues<typeof sectionName> as any);
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
    const top = TopOperator.init();
    top.test();
    asU.trigger.deleteAll();
    asU.trigger.addFirstOfMonth("triggerFirstOfMonth");
    asU.trigger.addOnEdit("triggerOnEdit");
  }
}

resetTriggers(false);

function testUpdateLeaseOngoingCharges() {
  const top = TopOperator.init();
  top.updateLeaseOngoingCharges();
  top.ss.batchUpdateRanges();
}

function testUpdateSubsidyOngoingCharges() {
  const top = TopOperator.init();
  top.updateSubsidyOngoingCharges();
  top.ss.batchUpdateRanges();
}

function testBuildOutMonthlyChargesAndPayments() {
  const top = TopOperator.init();
  const cfp = top.buildOutChargesForMonth();
  top.buildOutPaymentsFromCharges(cfp);
  top.ss.batchUpdateRanges();
}
