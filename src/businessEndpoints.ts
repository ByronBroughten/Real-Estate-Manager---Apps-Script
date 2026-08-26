import { makeStructuredConfig } from "./00_base/base";
import type { ColumnFullNameSimple } from "./01_generatedConfigs/columnConfigsTypes";
import { ColumnConfigOperator } from "./04_SpreadsheetNamed/ColumnConfigOperator";
import { SpreadsheetNamed } from "./04_SpreadsheetNamed/SpreadsheetNamed";
import type { FilterWithSuffix } from "./utils/Str";

const endpointSuffix = "RunAndStatus";
export type ApiEndpointName = FilterWithSuffix<
  ColumnFullNameSimple,
  typeof endpointSuffix
>;

export const businessEndpoints = makeStructuredConfig(
  {} as Record<ApiEndpointName, () => void>,
  {
    spreadsheetControls_appendSheetAndColumnConfigRowsRunAndStatus: () => {
      const columnConfig = ColumnConfigOperator.init();
    },
    spreadsheetControls_fillRowIdsRunAndStatus: () => {
      const spreadsheet = SpreadsheetNamed.init();
      spreadsheet.fillMissingRowIds();
      spreadsheet.raw.batchUpdateGSheets();
      // Test this first on just Test spreadsheet, then on all spreadsheets. Make sure to test on a spreadsheet that has no missing row IDs, and one that does.
    },
    occupancy_buildLedgerRunAndStatus: () => {
      // TO DO: implement this endpoint
    },
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
    // updatePeriodicCharges: () => {
    //   "TODO";
    // },
    // buildHhLedger: () => {
    // },
  } as const,
);
