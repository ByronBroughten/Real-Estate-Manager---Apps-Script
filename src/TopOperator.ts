import { OperatorBase } from "./3. SpreadsheetNamed/ClassBases/OperatorBase";
import { SpreadsheetNamed } from "./3. SpreadsheetNamed/SpreadsheetNamed";
import { LeaseMgmt } from "./4. BusinessClasses/LeaseMgmt";
import { SubsidyMgmt } from "./4. BusinessClasses/SubsidyMgmt";
import { ApiAggregate } from "./ApiAggregate";
import { ApiSingle } from "./ApiSingle";

export type StandardEvent = {
  colIdxBase1: number;
  rowIdxBase1: number;
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
    this.ss.gatherRequestsAndBatchUpdate();
  }
  test() {
    return "test";
  }
  private standardizeEvent(
    e: GoogleAppsScript.Events.SheetsOnEdit,
  ): StandardEvent {
    const colIdxBase1 = e.range.getColumn();
    const rowIdxBase1 = e.range.getRow();
    return { colIdxBase1, rowIdxBase1 };
  }

  onTrueValueEntered(e: GoogleAppsScript.Events.SheetsOnEdit): void {
    const sheetGid = e.range.getSheet().getSheetId();
    const schema = this.schema;
    const { tableName } = schema.sheetByGid(sheetGid);

    if (tableName === "api") {
      const apiSingle = new ApiSingle(this.ss, this.standardizeEvent(e));
      apiSingle.handleEvent();
    } else if (schema.isInTnGroup("aggregateApi", tableName)) {
      const apiAggregate = new ApiAggregate(
        this.ss,
        tableName,
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
