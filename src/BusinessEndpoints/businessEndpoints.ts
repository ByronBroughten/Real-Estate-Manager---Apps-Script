import { makeStructuredConfig } from "../00_base/base";
import type { ColumnFullNameSimple } from "../02_generatedTraits/03_columnTraits";
import type { FilterWithSuffix } from "../utils/Str";

const endpointSuffix = "RunAndStatus";
export type ApiEndpointName = FilterWithSuffix<
  ColumnFullNameSimple,
  typeof endpointSuffix
>;

export const businessEndpoints = makeStructuredConfig(
  {} as Record<ApiEndpointName, () => void>,
  {
    spreadsheetControls_appendSheetAndColumnConfigRowsRunAndStatus: () => {
      // TO DO: implement this endpoint
    },
    spreadsheetControls_fillRowIdsRunAndStatus: () => {
      // TO DO: implement this endpoint
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
