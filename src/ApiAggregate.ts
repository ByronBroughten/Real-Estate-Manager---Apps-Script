import type { GroupSectionName } from "./appSchema/1. attributes/sectionAttributes";
import type { SectionValues } from "./appSchema/1. attributes/varbAttributes";
import { ChargeMgmt } from "./StateHandlers/ChargeMgmt";
import { ExpenseMgmt } from "./StateHandlers/ExpenseMgmt";
import { OperatorBase } from "./StateHandlers/HandlerBases/OperatorBase";
import { LedgerMgmt } from "./StateHandlers/LedgerMgmt";
import { PaymentMgmt } from "./StateHandlers/PaymentMgmt";
import type { Sheet } from "./StateHandlers/Sheet";
import type { Spreadsheet } from "./StateHandlers/Spreadsheet";
import type { StandardEvent } from "./TopOperator";

type AggregateApiFns = {
  readonly [SN in GroupSectionName<"aggregateApi">]: (
    values: SectionValues<SN>,
  ) => void;
};

export class ApiAggregate<
  SN extends GroupSectionName<"aggregateApi">,
> extends OperatorBase {
  constructor(ss: Spreadsheet, sectionName: SN, event: StandardEvent) {
    super(ss);
    this.apiSheet = this.sheet(sectionName);
    this.event = event;
  }
  readonly apiSheet: Sheet<SN>;
  readonly event: StandardEvent;
  readonly ledgerMgmt = new LedgerMgmt(this.ss);
  readonly chargeMgmt = new ChargeMgmt(this.ss);
  readonly expenseMgmt = new ExpenseMgmt(this.ss);
  readonly paymentMgmt = new PaymentMgmt(this.ss);

  readonly aggregateApiFns: AggregateApiFns = {
    // if it's a single, it should be in the api sheet. Otherwise, it's in one of these.
    // single
    buildHhLedger: (values) => this.ledgerMgmt.buildHhLedger(values),
    // multis
    addExpenses: (_) => this.expenseMgmt.addExpenses(),
    addHhChargeOnetime: (values) => this.chargeMgmt.addHhChargeOnetime(values),
    addHhPaymentOnetime: (values) =>
      this.paymentMgmt.addHhPaymentOnetime(values),
  };
  handleEvent() {
    this.isApiTriggered() && this.tryCallApi();
  }
  private isApiTriggered() {
    const api = this.apiSheet;
    const header = api.headerByColIdxBase1(this.event.colIdxBase1);
    const isSecondBodyRow =
      this.event.rowIdxBase1 === api.secondBodyRowIdxBase1;
    const isEnter = header === "Enter";
    return isSecondBodyRow && isEnter;
  }

  private tryCallApi() {
    this.prepCallApi();
    try {
      this.callApi();
      this.resetApi();
    } catch (e) {
      this.handleApiCallError(e as Error);
    }
  }
  private prepCallApi() {
    const firstUnhiddenRow = this.apiSheet.secondBodyRow;
    firstUnhiddenRow.setValue("enterStatus", "Processing...");
    this.batchUpdateRanges();
  }
  private callApi() {
    const apiTopRow = this.apiSheet.topBodyRow;
    const { sectionName } = this.apiSheet;
    const apiValues = apiTopRow.validateValues();
    this.aggregateApiFns[sectionName](
      apiValues as SectionValues<typeof sectionName> as any,
    );
  }
  private resetApi() {
    this.apiSheet.DELETE_ALL_BODY_ROWS_BUT_TOP();
    this.apiSheet.addRowDefault();
    this.batchUpdateRanges();
  }
  private handleApiCallError(error: Error) {
    console.error(error);
    this.apiSheet.secondBodyRow.setValue(
      "enterStatus",
      "Error: " + (error as Error).message,
    );
    this.ss.batchUpdateRanges();
  }
}
