import type { Endpoints } from "./06_API/Endpoints";
import { Dat } from "./utils/Dat";

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
        const lastEndDate = lastActiveTerm.value("endDate");
        if (nextStartDate <= lastStartDate) {

        }
        if (lastEndDate && lastEndDate < nextStartDate) {
          throw new Error("Start date next occupancy terms is before end date of latest")
        };

        if (!lastEndDate) {
          // lastActiveTerm.updateValue("endDate", Dat.addDays(lastStartDate, 365));
          
        }
        occupancyTerms.appendRowWithVals({
          startDate: nextStartDate,
          endDate: occRow.value("nextTermsEndDate"),
          rentChargeMonthly: occRow.value("nextBaseRentChargeMonthly"),
          caretakerRentReductionMonthly: occRow.value("nextCaretakerRentReductionMonthly"),
          gasWaterHeating: occRow.value("nextGasWaterHeating"),
          gasHeating: occRow.value("nextGasHeating"),
          gasCooking: occRow.value("nextGasCooking"),
          electricWaterHeating: occRow.value("nextElectricWaterHeating"),
          electricHeating: occRow.value("nextElectricHeating"),
          electricCooking: occRow.value("nextElectricCooking"),
          districtEnergyWaterHeating: occRow.value("nextDistrictEnergyWaterHeating"),
          districtEnergyHeating: occRow.value("nextDistrictEnergyHeating")
        })
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
