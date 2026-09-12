import type { Endpoints } from "./06_API/Endpoints";
import { addPropertyExpense } from "./businessEndpoints/addPropertyExpense";
import { buildLedger } from "./businessEndpoints/buildLedger";
import { updateTerms } from "./businessEndpoints/updateTerms";

export const businessEndpoints: Endpoints = {
  occupancy_updateTermsTimeLastRan: updateTerms,
  addPropertyExpense_runStatus: addPropertyExpense,
  occupancy_buildLedgerTimeLastRan: buildLedger,
};
