import type { GroupToTableName } from "./appSchema/0. sheetMetaData/4.1 tableNameGroups";
import type { TableValues } from "./appSchema/0. sheetMetaData/5. columnAttributes";
import { ChargeMgmt } from "./StateHandlers/ChargeMgmt";
import { ExpenseMgmt } from "./StateHandlers/ExpenseMgmt";
import type { SheetNamed } from "./StateHandlers/GenericHandlers/SheetNamed";
import type { Spreadsheet } from "./StateHandlers/GenericHandlers/SpreadsheetNamed";
import { OperatorBase } from "./StateHandlers/HandlerBases/OperatorBase";
import { PaymentMgmt } from "./StateHandlers/PaymentMgmt";
import type { StandardEvent } from "./TopOperator";

type AggregateApiFns = {
  readonly [TN in GroupToTableName<"aggregateApi">]: (
    values: TableValues<TN>,
  ) => void;
};

export class ApiAggregate<
  TN extends GroupToTableName<"aggregateApi">,
> extends OperatorBase {
  constructor(ss: Spreadsheet, tableName: TN, event: StandardEvent) {
    super(ss);
    this.apiSheet = this.sheet(tableName);
    this.event = event;
  }
  readonly apiSheet: SheetNamed<TN>;
  readonly event: StandardEvent;
  readonly aggregateApiFns: AggregateApiFns = {
    // multis
    addPropertyExpenses: (_) => new ExpenseMgmt(this.ss).addPropertyExpenses(),
    addOccChargeOnetime: (values) =>
      new ChargeMgmt(this.ss).addOccChargeOnetime(values),
    addOccPaymentOnetime: (values) =>
      new PaymentMgmt(this.ss).addOccPaymentOnetime(values),
  };
  handleEvent() {
    this.isApiTriggered() && this.tryCallApi();
  }
  private isApiTriggered() {
    const api = this.apiSheet;
    const header = api.headerByColIdxBase1(this.event.colIdxBase1);
    const isTopBodyRow = this.event.rowIdxBase1 === api.topBodyRowIdxBase1;
    const isEnter = header === "Enter";
    return isTopBodyRow && isEnter;
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
    const topRow = this.apiSheet.topBodyRow;
    topRow.setValue("enterStatus", "Processing...");
    this.gatherRequestsAndBatchUpdate();
  }
  private callApi() {
    const apiTopRow = this.apiSheet.topBodyRow;
    const { tableName } = this.apiSheet;
    const apiValues = apiTopRow.validateValues();
    this.aggregateApiFns[tableName](
      apiValues as TableValues<typeof tableName> as any,
    );
  }
  private resetApi() {
    this.apiSheet.DELETE_ALL_BODY_ROWS();
    this.apiSheet.addRowDefault();
    this.gatherRequestsAndBatchUpdate();
  }
  private handleApiCallError(error: Error) {
    console.error(error);
    this.apiSheet.topBodyRow.setValue(
      "enterStatus",
      "Error: " + (error as Error).message,
    );
    this.gatherRequestsAndBatchUpdate();
    throw error;
  }
}
