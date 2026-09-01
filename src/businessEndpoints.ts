import type { ColumnFullNameSimple } from "./01_generatedConfigs/columnConfigsTypes";
import { makeStructuredConfig } from "./01_generatedConfigs/makeConfigs";
import type { Endpoints } from "./06_API/baseEndpoints";
import { OccupancyUpdateTermsSelect } from "./06_API/SelectorEndpoint";
import type { FilterWithSuffix } from "./utils/Str";

const endpointSuffix = "RunAndStatus";
export type ApiEndpointName = FilterWithSuffix<
  ColumnFullNameSimple,
  typeof endpointSuffix
>;

export const businessEndpoints = makeStructuredConfig(
  {} as Endpoints,
  {
    occupancy_buildLedgerRunAndStatus: () => {
      // TO DO: implement this endpoint
    },
    occupancy_updateTermsSelect: () => {
      OccupancyUpdateTermsSelect.init().execute();
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
