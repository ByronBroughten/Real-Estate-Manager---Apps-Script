import type { Endpoints } from "./06_API/baseEndpoints";

export const businessEndpoints: Endpoints = {
  occupancy_buildLedgerTimeLastRan: () => {
    // TODO: implement this endpoint
  },
  // TODO: selector endpoint functionality may be removed in the future, as the speed floor doesn't let them feel good, and their functionality may not be needed.
  // occupancy_updateTermsSelect: ({ isSelected, ...props }) => {
  //   OccupancyUpdateTermsSelect.init(props).execute(isSelected);
  // },
};
