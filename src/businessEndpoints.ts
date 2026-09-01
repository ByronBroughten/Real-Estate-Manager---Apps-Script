import type { Endpoints } from "./06_API/baseEndpoints";
import { OccupancyUpdateTermsSelect } from "./06_API/SelectorEndpoint";

export const businessEndpoints: Endpoints = {
  occupancy_buildLedgerTimeLastRan: () => {
    // TO DO: implement this endpoint
  },
  occupancy_updateTermsSelect: ({ isSelected, ...props }) => {
    OccupancyUpdateTermsSelect.init(props).execute(isSelected);
  },
};
