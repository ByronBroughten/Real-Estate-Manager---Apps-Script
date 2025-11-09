import {
  isInSnGroup,
  type SectionName,
} from "./appSchema/1. attributes/sectionAttributes.js";
import type { SectionValues } from "./appSchema/1. attributes/varbAttributes.js";
import { TopOperator } from "./TopOperator.js";
import { asU } from "./utilitiesAppsScript.js";

function triggerFirstOfMonth() {
  const top = TopOperator.init();
  top.monthlyRentUpdate();
}

// function buildOutAllCharges() {
//   const top = TopOperator.init();
//   top.buildOutAllCharges();
// }

// function buildOutAllPayments() {
//   const top = TopOperator.init();
//   top.buildOutAllPayments();
// }

type GetValues<SN extends SectionName> = () => SectionValues<SN>;
type UseValues<SN extends SectionName> = (values: SectionValues<SN>) => void;

type OnEdit<SN extends SectionName> = {
  getValues: GetValues<SN>;
  useValues: UseValues<SN>;
};

function testSubsidyContractChanges() {
  const top = TopOperator.init();
  top.updateSubsidyContractCharges();
  top.ss.batchUpdateRanges();
}

function testRentAndUtilityChanges() {
  const top = TopOperator.init();
  top.updateRentAndUtilityCharges();
  top.ss.batchUpdateRanges();
}

function testBuildOutCharges() {
  const top = TopOperator.init();
  top.buildOutChargesFirstOfMonth();
  top.ss.batchUpdateRanges();
}

function testBuildOutPayments() {
  const top = TopOperator.init();
  top.buildOutPaymentsFirstOfMonth();
  top.ss.batchUpdateRanges();
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
      const values = apiRow.validateValues();

      if (sectionName !== "buildHhLedger") {
        apiRow.resetToDefault();
        top.ss.batchUpdateRanges();
      }

      try {
        top[sectionName](values as SectionValues<typeof sectionName> as any);
      } catch (e) {
        console.error(e);
        apiRow.setValues(values);
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
