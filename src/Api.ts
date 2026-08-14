import { configGet } from "./00_rawPrecursors/spreadsheetConfig";
import { SpreadsheetRaw } from "./01_SpreadsheetRaw/SpreadsheetRaw";
import { SpreadsheetNamedBase } from "./04_SpreadsheetNamed/ClassBases/SpreadsheetNamedBase";
import { SpreadsheetNamed } from "./04_SpreadsheetNamed/SpreadsheetNamed";

export type SheetEventStandard = {
  colIdxBase0: number;
  rowIdxBase0: number;
  sheetId: number;
  value: GoogleAppsScript.Events.SheetsOnEdit["value"];
};

// Each business service will:
// - inherit SpreadsheetNamedBase
// - I'll handle endpoints one at a time. We'll see if we need this class or not.
// - Endpoint would have endpointName; SelectorEndpoint would have that and selectorName.
//   - Both names would be sheetName:columnName

// Ok, so which endpoint should I implement? I should make a list.
// Probably the straight-api ones first.

export class Api extends SpreadsheetNamedBase {
  static init() {
    return new Api(SpreadsheetNamedBase.initSpreadsheetNamedProps());
  }
  get ssr(): SpreadsheetRaw {
    return new SpreadsheetRaw(this.spreadsheetRawProps);
  }
  get ssn(): SpreadsheetNamed {
    return new SpreadsheetNamed(this.spreadsheetNamedProps);
  }
  readonly endpoints = {
    // addExpenses: () => new ExpenseMgmt(this.ssn).addPropertyExpenses(),
    // addOccChargeOnetime: () => new ChargeMgmt(this.ssn).addOccChargeOnetime(),
    // addHhPaymentOnetime: () => new PaymentMgmt(this.ssn).addOccPaymentOnetime(),
    // updateLeasesAndSubsidyContracts: () => {
    // This will be contained in one function, not here;
    // const leaseMgmt = new LeaseMgmt(this.ssn);
    // leaseMgmt.doPeriodicLeaseUpdates();
    // const subsidyMgmt = new SubsidyMgmt(this.ssn);
    // subsidyMgmt.doPeriodicSubsidyUpdates();
    // },
    updatePeriodicCharges: () => {
      "TODO";
    },
    buildHhLedger: () => {
      // new LedgerMgmt(this.ssn).buildHhLedger();
    },
  };
  static getEventRowIndexBase0(
    e: GoogleAppsScript.Events.SheetsOnEdit,
  ): number {
    return e.range.getRow() - 1;
  }
  static isSuspectedApiCall(e: GoogleAppsScript.Events.SheetsOnEdit): boolean {
    if (e.value !== "TRUE") {
      return false;
    } else if (
      Api.getEventRowIndexBase0(e) !== configGet("actionRowIdxBase0")
    ) {
      return false;
    } else {
      return true;
    }
  }
  handleSheetOnEditEvent(e: GoogleAppsScript.Events.SheetsOnEdit): void {
    const rowIndex = Api.getEventRowIndexBase0(e);
    const ssr = this.ssr;
    const sheetGid = e.range.getSheet().getSheetId();
    const colIndex = e.range.getColumn() - 1;
    // isApiColumn

    const eSheet = ssr.sheet(sheetGid);
    const eRow = eSheet.row(rowIndex);
    const eTopBodyRow = eSheet.row(ssr.schema.topDataRowIdx);
    const e2ndBodyRow = eSheet.row(ssr.schema.topDataRowIdx + 1);

    eTopBodyRow.updateValue(colIndex, "Processing...");
    e2ndBodyRow.updateValue(colIndex, "");
    ssr.batchUpdateGSheets();

    const endpointName = this._endpointNameOrNull(sheetGid, colIndex);

    try {
      // TO DO: implement endpoints by valid endpoint names
      this.endpoints.buildHhLedger();
    } catch (error) {
      console.error(error);
      e2ndBodyRow.updateValue(colIndex, "Error: " + (error as Error).message);
    } finally {
      eRow.updateValue(colIndex, "FALSE");
      eTopBodyRow.updateValue(
        colIndex,
        `Last ran on ${new Date().toLocaleString()}`,
      );
      // TO DO: set "last ran" for each row;
      // TO DO: set the "select" column to FALSE for each row;

      ssr.batchUpdateGSheets();
    }
  }
  private _endpointNameOrNull(
    sheetGid: number,
    colIndex: number,
  ): string | null {
    const sheetSchema = this.ssn.schema.sheetByGid(sheetGid);
    const { columnName } = sheetSchema.columnByIndex(colIndex);
    const keyEndPhrase = "statusAndRun";
    const isStatusAndRunColumn =
      columnName.slice(-keyEndPhrase.length) === keyEndPhrase;
    if (isStatusAndRunColumn) {
      return sheetSchema.column(columnName).fullName;
    } else {
      return null;
    }
  }
}
