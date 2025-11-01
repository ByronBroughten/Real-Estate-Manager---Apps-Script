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

// function buildOutCharges() {
//   const top = TopOperator.init();
//   top.buildOutCharges();
// }

// function buildHhLedger() {
//   const top = TopOperator.init();
//   top.buildHhLedger();
// }

// function buildOutPayments() {
//   const top = TopOperator.init();
//   top.buildOutPayments();
// }

type GetValues<SN extends SectionName> = () => SectionValues<SN>;
type UseValues<SN extends SectionName> = (values: SectionValues<SN>) => void;

type OnEdit<SN extends SectionName> = {
  getValues: GetValues<SN>;
  useValues: UseValues<SN>;
};

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

      apiRow.resetToDefault();
      top.ss.batchUpdateRanges();

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
