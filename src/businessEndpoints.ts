import type { Endpoints } from "./06_API/Endpoints";

export const businessEndpoints: Endpoints = {
  occupancy_updateTermsTimeLastRan: {
    action: (ss, { selectedRowIndexes }) => {
      ss.sheet("occupancy")
      ss.sheet("occupancyTerms").data.prepFetchColumnsFull("startDate", "endDate");
      // Those are the only two I need, yeah?

      const occupancy = ss.sheet("occupancy");
      const occCol = occupancy.data.columns(
        "nextTermsStartDate",
        "nextBaseRentChargeMonthly",
      );
      

      const occupancyTerms = ss.sheet("occupancyTerms");
      for (const rowIndex of selectedRowIndexes) {
        occCol.nextBaseRentChargeMonthly.value(rowIndex);
        occCol.nextTermsStartDate.value(rowIndex);
        
      }
      return "Occupancy terms updated";
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
