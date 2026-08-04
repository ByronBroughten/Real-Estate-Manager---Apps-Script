import { OperatorBase } from "./3. SpreadsheetNamed/ClassBases/OperatorBase";
import { SpreadsheetNamed } from "./3. SpreadsheetNamed/SpreadsheetNamed";
import { LeaseMgmt } from "./4. BusinessClasses/LeaseMgmt";
import { SubsidyMgmt } from "./4. BusinessClasses/SubsidyMgmt";
import { ApiAggregate } from "./ApiAggregate";
import { ApiSingle } from "./ApiSingle";

export type SheetEventStandard = {
  colIdxBase0: number;
  rowIdxBase0: number;
};

export class TopOperator extends OperatorBase {
  readonly leaseMgmt = new LeaseMgmt(this.ss);
  readonly subsidyMgmt = new SubsidyMgmt(this.ss);

  doPeriodicContractUpdates() {
    this.leaseMgmt.doPeriodicLeaseUpdates();
    this.subsidyMgmt.doPeriodicSubsidyUpdates();
    this.gatherRequestsAndBatchUpdate();
  }
  monthlyRentUpdate() {
    this.doPeriodicContractUpdates();
    // const cfp = this.buildOutChargesForMonth();
    // this.buildOutPaymentsFromCharges(cfp);
    this.ss.raw.batchUpdateGSheets();
  }
  test() {
    return "test";
  }
  private standardizeEvent(
    e: GoogleAppsScript.Events.SheetsOnEdit,
  ): SheetEventStandard {
    const colIdxBase0 = e.range.getColumn() - 1;
    const rowIdxBase0 = e.range.getRow() - 1;
    return { colIdxBase0, rowIdxBase0 };
  }

  onTrueValueEntered(e: GoogleAppsScript.Events.SheetsOnEdit): void {
    const sheetGid = e.range.getSheet().getSheetId();
    const schema = this.schema;
    const { sheetName } = schema.raw.sheet(sheetGid);
    if (sheetName === "api") {
      const apiSingle = new ApiSingle(this.ss, this.standardizeEvent(e));
      apiSingle.handleEvent();
    } else if (schema.isInTnGroup("aggregateApi", sheetName)) {
      const apiAggregate = new ApiAggregate(
        this.ss,
        sheetName,
        this.standardizeEvent(e),
      );
      apiAggregate.handleEvent();
    } else {
      return;
    }
  }
  static init(): TopOperator {
    const ss = SpreadsheetNamed.init();
    return new TopOperator(ss);
  }
}
