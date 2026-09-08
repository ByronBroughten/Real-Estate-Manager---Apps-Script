import type { Endpoints } from "./06_API/Endpoints";

export const businessEndpoints: Endpoints = {
  occupancy_updateTermsTimeLastRan: {
    action: () => {
      // TODO: implement this endpoint
    },
    timeLastRan: "updateTermsTimeLastRan",
    runStatus: "updateTermsRunStatus",
    selector: "updateTermsSelect",
  },
  occupancy_buildLedgerTimeLastRan: {
    action: () => {
      // TODO: implement this endpoint
    },
    timeLastRan: "buildLedgerTimeLastRan",
    runStatus: "buildLedgerRunStatus",
    selector: "buildLedgerSelect",
  },
  // TODO: selector endpoint functionality may be removed in the future, as the speed floor doesn't let them feel good, and their functionality may not be needed.
  // occupancy_updateTermsSelect: {
  //   action: (ss, { isChecked }) => {
  //     ss.sheet("occupancy").data.column("updateTermsSelect").updateAllCells({ value: isChecked });
  //   },
  //   runsOnUncheck: true,
  // },
};
