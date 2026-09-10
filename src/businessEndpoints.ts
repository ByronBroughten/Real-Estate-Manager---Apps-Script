import type { Endpoints } from "./06_API/Endpoints";
import { Dat } from "./utils/Dat";

export const businessEndpoints: Endpoints = {
  occupancy_updateTermsTimeLastRan: {
    timeLastRan: "updateTermsTimeLastRan",
    runStatus: "updateTermsRunStatus",
    selector: { column: "updateTermsSelect" },
    action: (ss, { selectedRowIndexes }) => {
      ss.sheet("occupancy").prepFetchColumnsSpecific(
        selectedRowIndexes,
        "id",
        "latestOccupancyTermsId",
        "nextTermsNoticeSentDate",
        "nextTermsStartDate",
        "nextTermsEndDate",
        "nextBaseRentChargeMonthly",
        "nextCaretakerRentReductionMonthly",
        "nextPetFeeMonthly",
        "nextGasWaterHeating",
        "nextGasHeating",
        "nextGasCooking",
        "nextElectricWaterHeating",
        "nextElectricHeating",
        "nextElectricCooking",
        "nextOtherElectric",
        "nextDistrictEnergyWaterHeating",
        "nextDistrictEnergyHeating",
        "nextWaterSewer",
        "nextTrashCollection",
        "nextTermsNotes",
      );
      ss.sheet("occupancyTerms").prepFetchColumnsFull(
        "id",
        "startDate",
        "endDate",
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
        if (nextStartDate <= lastStartDate) {
          throw new Error(
            "Start date of next occupancy terms is on or before start date of latest",
          );
        }
        const lastEndDate = lastActiveTerm.value("endDate");
        if (lastEndDate && nextStartDate <= lastEndDate) {
          throw new Error(
            "Start date of next occupancy terms is on or before end date of latest",
          );
        }
        if (!lastEndDate) {
          lastActiveTerm.updateValue("endDate", Dat.dayBefore(nextStartDate));
        }

        occupancyTerms.appendRowWithAllVals({
          noticeDate: occRow.value("nextTermsNoticeSentDate"),
          startDate: nextStartDate,
          endDate: occRow.value("nextTermsEndDate"),
          occupancyId: occRow.value("id"),
          rentChargeMonthly: occRow.value("nextBaseRentChargeMonthly"),
          caretakerRentReductionMonthly: occRow.value(
            "nextCaretakerRentReductionMonthly",
          ),
          gasWaterHeating: occRow.value("nextGasWaterHeating"),
          gasHeating: occRow.value("nextGasHeating"),
          gasCooking: occRow.value("nextGasCooking"),
          electricWaterHeating: occRow.value("nextElectricWaterHeating"),
          electricHeating: occRow.value("nextElectricHeating"),
          electricCooking: occRow.value("nextElectricCooking"),
          districtEnergyWaterHeating: occRow.value(
            "nextDistrictEnergyWaterHeating",
          ),
          districtEnergyHeating: occRow.value("nextDistrictEnergyHeating"),
          otherElectric: occRow.value("nextOtherElectric"),
          waterSewer: occRow.value("nextWaterSewer"),
          trashCollection: occRow.value("nextTrashCollection"),
          petFeeMonthly: occRow.value("nextPetFeeMonthly"),
          notes: occRow.value("nextTermsNotes"),
        });
      }
      return "Occupancy terms updated";
    },
  },
  addPropertyExpense_runStatus: {
    runStatus: "addPropertyExpenseRunStatus",
    action: (ss) => {
      
    }
  },
  occupancy_buildLedgerTimeLastRan: {
    timeLastRan: "buildLedgerTimeLastRan",
    runStatus: "buildLedgerRunStatus",
    selector: { column: "buildLedgerSelect" },
    action: () => {
      // TODO: implement this endpoint
    },
  },
  // TODO: selector endpoint functionality may be removed in the future, as the speed floor doesn't let them feel good, and their functionality may not be needed.
  // occupancy_updateTermsSelect: {
  //   action: (ss, { isChecked }) => {
  //     ss.sheet("occupancy").data.column("updateTermsSelect").updateAllCells({ value: isChecked });
  //   },
  //   runsOnUncheck: true,
  // },
};
