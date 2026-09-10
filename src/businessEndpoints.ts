import type { Endpoints } from "./06_API/Endpoints";

export const businessEndpoints: Endpoints = {
  occupancy_updateTermsTimeLastRan: {
    action: (ss, { selectedRowIndexes }) => {
      ss.sheet("occupancyTerms").prepFetchColumnsFull(
        "occupancyId",
        "startDate",
        "endDate",
      );
      ss.sheet("occupancy").prepFetchColumnsSpecific(
        selectedRowIndexes,
        "id",
        "nextBaseRentChargeMonthly",
        "nextTermsStartDate",
      );
      ss.fetchAllPrepped();
      const occupancy = ss.sheet("occupancy");
      const occupancyTerms = ss.sheet("occupancyTerms");
      for (const rowIndex of selectedRowIndexes) {
        const occRow = occupancy.row(rowIndex);
        const nextStartDate = occRow.value("nextTermsStartDate");
        const lastActiveTerms = occupancyTerms.rows.filter((otRow) => {
          const endDate = otRow.valueOrEmpty("endDate");

          return otRow.value("occupancyId") === occRow.value("id") &&
            (endDate === "") &&
            otRow.value("startDate") < nextStartDate;
        });
        if (lastActiveTerms.length < 1) {
          throw new Error("For now this relies on there being active lease terms.");
        }
        if (lastActiveTerms.length > 1) {
          throw new Error("More than 1 term span for this occupancy has no end date. Please resolve down to 1.")
        }
        const lastActiveTerm = lastActiveTerms[0]!;
        const startDate = lastActiveTerm?.value("startDate");
        if (startDate)
        
        

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
