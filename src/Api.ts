import { SpreadsheetRaw } from "./02_AppsScriptRaw/SpreadsheetRaw";
import { SpreadsheetNamedBase } from "./03_SpreadsheetNamed/ClassBases/SpreadsheetNamedBase";
import { SpreadsheetNamed } from "./03_SpreadsheetNamed/SpreadsheetNamed";
import { ChargeMgmt } from "./04_BusinessClasses/ChargeMgmt";
import { ExpenseMgmt } from "./04_BusinessClasses/ExpenseMgmt";
import { LeaseMgmt } from "./04_BusinessClasses/LeaseMgmt";
import { LedgerMgmt } from "./04_BusinessClasses/LedgerMgmt";
import { PaymentMgmt } from "./04_BusinessClasses/PaymentMgmt";
import { SubsidyMgmt } from "./04_BusinessClasses/SubsidyMgmt";

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
  get ssr(): SpreadsheetRaw {
    return new SpreadsheetRaw(this.spreadsheetRawProps);
  }
  get ssn(): SpreadsheetNamed {
    return new SpreadsheetNamed(this.spreadsheetNamedProps);
  }
  readonly endpoints = {
    addExpenses: () => new ExpenseMgmt(this.ssn).addPropertyExpenses(),
    addOccChargeOnetime: () => new ChargeMgmt(this.ssn).addOccChargeOnetime(),
    addHhPaymentOnetime: () => new PaymentMgmt(this.ssn).addOccPaymentOnetime(),
    updateLeasesAndSubsidyContracts: () => {
      // This will be contained in one function, not here;
      const leaseMgmt = new LeaseMgmt(this.ssn);
      leaseMgmt.doPeriodicLeaseUpdates();
      const subsidyMgmt = new SubsidyMgmt(this.ssn);
      subsidyMgmt.doPeriodicSubsidyUpdates();
    },
    updatePeriodicCharges: () => {
      "TODO";
    },
    buildHhLedger: () => {
      new LedgerMgmt(this.ssn).buildHhLedger();
    },
  };
  handleSheetOnEditEvent(e: GoogleAppsScript.Events.SheetsOnEdit): void {
    const ssr = this.ssr;
    if (e.value !== "TRUE") {
      return;
    }
    const rowIdx = e.range.getRow() - 1;
    if (rowIdx !== ssr.schema.actionRowIdx) {
      return;
    }
    const sheetGid = e.range.getSheet().getSheetId();
    const colIdx = e.range.getColumn() - 1;
    // isApiColumn

    const eSheet = ssr.sheet(sheetGid);
    const eRow = eSheet.row(rowIdx);
    const eTopBodyRow = eSheet.row(ssr.schema.topDataRowIdx);
    const e2ndBodyRow = eSheet.row(ssr.schema.topDataRowIdx + 1);

    eTopBodyRow.updateValue(colIdx, "Processing...");
    e2ndBodyRow.updateValue(colIdx, "");
    ssr.batchUpdateGSheets();

    const endpointName = this._endpointNameOrNull(sheetGid, colIdx);

    try {
      // TO DO: implement endpoints by valid endpoint names
      this.endpoints.addExpenses();
    } catch (error) {
      console.error(error);
      e2ndBodyRow.updateValue(colIdx, "Error: " + (error as Error).message);
    } finally {
      eRow.updateValue(colIdx, "FALSE");
      eTopBodyRow.updateValue(
        colIdx,
        `Last ran on ${new Date().toLocaleString()}`,
      );
      // TO DO: set "last ran" for each row;
      // TO DO: set the "select" column to FALSE for each row;

      ssr.batchUpdateGSheets();
    }
  }
  private _endpointNameOrNull(sheetGid: number, colIdx: number): string | null {
    const sheetSchema = this.ssn.schema.sheetByGid(sheetGid);
    const { columnName } = sheetSchema.columnByIndex(colIdx);
    const keyEndPhrase = "statusAndRun";
    const isStatusAndRunColumn =
      columnName.slice(-keyEndPhrase.length) === keyEndPhrase;
    if (isStatusAndRunColumn) {
      return sheetSchema.sheetColName(columnName);
    } else {
      return null;
    }
  }
}
