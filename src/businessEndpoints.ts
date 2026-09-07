import type { ColumnFullName } from "./01_generatedConfigs/columnConfigsTypes";
import type { Endpoints } from "./06_API/baseEndpoints";

// Does it make sense for these to be in the same sheet as the endpoint entry?
// Yes, it does. But the selector column need not. Yeah?
// I want to accomodate two kinds of endpoints right now: selector and runner.
// Then there are also bulk endpoints.

type EndpointNext = {
  timeLastRan?: ColumnFullName<"string">;
  runStatus?: ColumnFullName<"string">;
};

export const businessEndpoints: Endpoints = {
  occupancy_updateTermsTimeLastRan: () => {
    // TODO: implement this endpoint
  },
  occupancy_buildLedgerTimeLastRan: () => {
    // TODO: implement this endpoint
  },
  // TODO: selector endpoint functionality may be removed in the future, as the speed floor doesn't let them feel good, and their functionality may not be needed.
  // occupancy_updateTermsSelect: ({ isSelected, ...props }) => {
  //   OccupancyUpdateTermsSelect.init(props).execute(isSelected);
  // },
};
