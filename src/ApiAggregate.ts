import type { GroupToTableName } from "./0. spreadsheetMetaData/4.1 tableNameGroups";
import type { TableValues } from "./0. spreadsheetMetaData/5. allColumnAttributes";
import { OperatorBase } from "./3. SpreadsheetNamed/ClassBases/OperatorBase";
import type { SheetNamed } from "./3. SpreadsheetNamed/SheetNamed";
import type { SpreadsheetNamed } from "./3. SpreadsheetNamed/SpreadsheetNamed";
import { ChargeMgmt } from "./4. BusinessClasses/ChargeMgmt";
import { ExpenseMgmt } from "./4. BusinessClasses/ExpenseMgmt";
import { PaymentMgmt } from "./4. BusinessClasses/PaymentMgmt";
import type { SheetEventStandard } from "./TopOperator";

type AggregateApiFns = {
  readonly [TN in GroupToTableName<"aggregateApi">]: (
    values: TableValues<TN>,
  ) => void;
};

export class ApiAggregate<
  TN extends GroupToTableName<"aggregateApi">,
> extends OperatorBase {
  constructor(ss: SpreadsheetNamed, sheetName: TN, event: SheetEventStandard) {
    super(ss);
    this.apiSheet = this.sheet(sheetName);
    this.event = event;
  }
  readonly apiSheet: SheetNamed<TN>;
  readonly event: SheetEventStandard;
  readonly aggregateApiFns: AggregateApiFns = {
    // multis
    addExpenses: (_) => new ExpenseMgmt(this.ss).addPropertyExpenses(),
    addOccChargeOnetime: (values) =>
      new ChargeMgmt(this.ss).addOccChargeOnetime(values),
    addHhPaymentOnetime: (values) =>
      new PaymentMgmt(this.ss).addOccPaymentOnetime(values),
  };
  handleEvent() {
    this.isApiTriggered() && this.tryCallApi();
  }
  private isApiTriggered() {
    const api = this.apiSheet;
    const header = api.raw.headerRow.value(this.event.colIdxBase0) as string;
    const isTopBodyRow = this.event.rowIdxBase0 === api.schema.topBodyRowIdx;
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
    const { sheetName } = this.apiSheet;
    const apiValues = apiTopRow.validateValues();
    this.aggregateApiFns[sheetName](
      apiValues as TableValues<typeof sheetName> as any,
    );
  }
  private resetApi() {
    this.apiSheet.RESET_TOP_DATA_ROW_DELETE_REST();
    this.apiSheet.appendRowDefault();
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
