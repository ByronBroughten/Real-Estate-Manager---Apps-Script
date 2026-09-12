import type { Endpoints } from "./06_API/Endpoints";
import { buildLedger } from "./businessEndpoints/buildLedger";
import { updateTerms } from "./businessEndpoints/updateTerms";

export const businessEndpoints: Endpoints = {
  occupancy_updateTermsTimeLastRan: updateTerms,
  addPropertyExpense_runStatus: {
    runStatus: "runStatus",
    action: (ss) => {},
  },
  occupancy_buildLedgerTimeLastRan: buildLedger,
};
