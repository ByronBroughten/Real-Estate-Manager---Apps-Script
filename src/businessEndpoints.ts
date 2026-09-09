import type { Endpoints } from "./06_API/Endpoints";

export const businessEndpoints: Endpoints = {
  occupancy_updateTermsTimeLastRan: {
    action: (ss, { selectedRowIndexes }) => {
      ss.sheet("occupancyTerms").prepFetchColumnsFull("occupancyId", "startDate", "endDate");
      ss.sheet("occupancy").prepFetchColumnsSpecific(
        selectedRowIndexes,
        "id",
        "nextBaseRentChargeMonthly",
        "nextTermsStartDate"
      );
      ss.fetchAllPrepped();
      const occupancy = ss.sheet("occupancy");
      const occupancyTerms = ss.sheet("occupancyTerms");
      for (const rowIndex of selectedRowIndexes) {
        const occRow = occupancy.row(rowIndex);
        const nextStartDate = occRow.valueNotEmpty("nextTermsStartDate");
        const lastActiveTerms = occupancyTerms.rows.filter((otRow) => {
          otRow.value("occupancyId") === occRow.valueNotEmpty("id") &&
          otRow.value("endDate") === "" &&
          otRow.value("startDate") <  nextStartDate 
        })
        lastActiveTerms.forEach((otRow) => {
        });

        if (lastActiveTerms.length === 0) {
          throw new Error("For now this relies on there being active terms.");
        }

        // occupancyTerms.appendRowWithVals()

        occRow.valueNotEmpty("nextBaseRentChargeMonthly");
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
