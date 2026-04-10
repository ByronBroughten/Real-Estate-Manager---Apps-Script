import { OperatorBase } from "./StateHandlers/HandlerBases/OperatorBase";
import { LeaseMgmt } from "./StateHandlers/LeaseMgmt";
import type { Spreadsheet } from "./StateHandlers/Spreadsheet";
import { SubsidyMgmt } from "./StateHandlers/SubsidyMgmt";
import type { StandardEvent } from "./TopOperator";

export class ApiSingle extends OperatorBase {
  constructor(ss: Spreadsheet, event: StandardEvent) {
    super(ss);
    this.event = event;
  }
  readonly event: StandardEvent;
  readonly leaseMgmt = new LeaseMgmt(this.ss);
  readonly subsidyMgmt = new SubsidyMgmt(this.ss);

  handleEvent() {}
}
