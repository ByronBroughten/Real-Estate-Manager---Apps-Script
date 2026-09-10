import type { Endpoints } from "./06_API/Endpoints";

export const businessEndpoints: Endpoints = {
  occupancy_updateTermsTimeLastRan: {
    action: (ss, { selectedRowIndexes }) => {
      ss.sheet("occupancyTerms").prepFetchColumnsFull("id", "startDate");
      ss.sheet("occupancy").prepFetchColumnsSpecific(
        selectedRowIndexes,
        "latestOccupancyTermsId",
        "nextBaseRentChargeMonthly",
        "nextTermsStartDate",
      );
      ss.fetchAllPrepped();
      const occupancy = ss.sheet("occupancy");
      const occupancyTerms = ss.sheet("occupancyTerms");
      for (const rowIndex of selectedRowIndexes) {
        const occRow = occupancy.row(rowIndex);
        const nextStartDate = occRow.value("nextTermsStartDate");
        const lastActiveTerm = occupancyTerms.rowByValue(
          "id",
          occRow.value("latestOccupancyTermsId"),
        );

        const lastStartDate = lastActiveTerm.value("startDate");
        const endDate = lastActiveTerm.value("endDate");
        if (nextStartDate <= lastStartDate) {

        }
        
        

        // occupancyTerms.appendRowWithVals()

        occRow.value("nextBaseRentChargeMonthly");
      }
      return "Occupancy terms updated";
    },
    timeLastRan: "updateTermsTimeLastRan",
    runStatus: "updateTermsRunStatus",
    selector: { column: "updateTermsSelect" },
  },
  occupancy_buildLedgerTimeLastRan: {
    action: () => {
      // TODO: implement this endpoint
    },
    timeLastRan: "buildLedgerTimeLastRan",
    runStatus: "buildLedgerRunStatus",
    selector: { column: "buildLedgerSelect" },
  },
  // TODO: selector endpoint functionality may be removed in the future, as the speed floor doesn't let them feel good, and their functionality may not be needed.
  // occupancy_updateTermsSelect: {
  //   action: (ss, { isChecked }) => {
  //     ss.sheet("occupancy").data.column("updateTermsSelect").updateAllCells({ value: isChecked });
  //   },
  //   runsOnUncheck: true,
  // },
};
