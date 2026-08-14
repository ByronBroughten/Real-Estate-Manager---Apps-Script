import { OperatorBase } from "./03_SpreadsheetNamed/ClassBases/OperatorBase";
import { SpreadsheetNamed } from "./03_SpreadsheetNamed/SpreadsheetNamed";
import { LeaseMgmt } from "./04_BusinessClasses/LeaseMgmt";
import { SubsidyMgmt } from "./04_BusinessClasses/SubsidyMgmt";

// rename this "endpoints"?
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
  static init(): TopOperator {
    const ss = SpreadsheetNamed.init();
    return new TopOperator(ss);
  }
}
