import type { SectionValues } from "../appSchema/1. attributes/varbAttributes";
import { utils } from "../utilitiesGeneral";
import { Arr } from "../utils/Arr";
import { OperatorBase } from "./HandlerBases/OperatorBase";
import type { Sheet } from "./Sheet";

interface AddLeaseProps {
  householdId: string;
  unitId: string;
  endPriorActiveLeases?: "yes" | "no";
  fillBlankValuesWithPriorLease?: "yes" | "no";
  startDate: Date;
  endDate?: Date;
  rentChargeBaseMonthly?: number;
  rentChargeUtilitiesMonthly?: number;
  caretakerRentReduction?: number;
  petFeeRecurring?: number;
}

const leaseAmountValueNames = [
  "rentChargeBaseMonthly",
  "rentChargeUtilitiesMonthly",
  "caretakerRentReduction",
  "petFeeRecurring",
] as const;
type LeaseAmountValueNames = (typeof leaseAmountValueNames)[number];

type LeaseAmountValues = Pick<
  SectionValues<"hhLeaseChargeOngoing">,
  LeaseAmountValueNames
>;

export class ContractMgmt extends OperatorBase {
  // add lease
  // add subsidy contract
  private leaseSheetProp: Sheet<"hhLeaseChargeOngoing"> | null = null;
  get leaseSheet() {
    if (!this.leaseSheetProp) {
      this.leaseSheetProp = this.ss.sheet("hhLeaseChargeOngoing");
    }
    return this.leaseSheetProp;
  }
  get leaseSchema() {
    return this.schema.section("hhLeaseChargeOngoing");
  }
  get defaultLeaseValues(): LeaseAmountValues {
    return {
      rentChargeBaseMonthly: 0,
      rentChargeUtilitiesMonthly: 0,
      caretakerRentReduction: 0,
      petFeeRecurring: 0,
    };
  }
  updateOngoingContracts() {
    this.updateLeaseOngoingCharges();
    this.updateSubsidyOngoingCharges();
  }
  updateLeaseOngoingCharges() {
    const household = this.sheet("household");
    const leaseChargeOngoing = this.ss.sheet("hhLeaseChargeOngoing");

    household.orderedRows.forEach((hh) => {
      const dateNext = hh.value("rentIncreaseDateNext");

      if (utils.date.isDateAndTodayOrPassed(dateNext)) {
        const rentChargeNext = hh.valueNumber("rentChargeMonthlyNext");
        const utilityChargeNext = hh.value("utilityChargeMonthlyNext");

        const dayBefore = utils.date.getDayBefore(dateNext);
        const chargesToEnd = leaseChargeOngoing.rowsFiltered({
          householdId: hh.value("id"),
          endDate: "",
        });

        chargesToEnd.sort((a, b) =>
          Arr.compareForSort(b.value("startDate"), a.value("startDate")),
        );

        chargesToEnd.forEach((charge) => {
          charge.setValue("endDate", dayBefore);
        });

        const householdId = hh.value("id");
        const lco = chargesToEnd.length > 0 ? chargesToEnd[0] : null;

        leaseChargeOngoing.addRowWithValues({
          householdId,
          unitId: hh.value("unitId"),
          rentChargeBaseMonthly: rentChargeNext,
          startDate: dateNext,
          ...(!lco && {
            petFeeRecurring: 0,
            caretakerRentReduction: 0,
            rentChargeUtilitiesMonthly: 0,
          }),
          ...(lco &&
            lco.values([
              "petFeeRecurring",
              "caretakerRentReduction",
              "rentChargeUtilitiesMonthly",
            ])),
          ...(utilityChargeNext !== "" && {
            rentChargeUtilitiesMonthly: utilityChargeNext,
          }),
        });

        hh.setValues({
          rentChargeNextOverride: "",
          utilityChargeNextOverride: "",
        });
      }
    });
  }
  addLease({
    householdId,
    startDate,
    endPriorActiveLeases,
    fillBlankValuesWithPriorLease,
    ...rest
  }: AddLeaseProps) {
    let defaults: LeaseAmountValues = this.defaultLeaseValues;
    if (fillBlankValuesWithPriorLease === "yes") {
      defaults = {
        ...defaults,
        ...this.priorLeaseValues(householdId),
      };
    }
    if (endPriorActiveLeases === "yes") {
      this.endActiveLeases(householdId, utils.date.getDayBefore(startDate));
    }
    this.leaseSheet.addRowWithValues({
      householdId,
      startDate,
      ...defaults,
      ...rest,
    });
  }
  private priorLeaseValues(householdId: string): LeaseAmountValues | {} {
    const priorUnendedLeases = this.leaseSheet.rowsFiltered({
      householdId,
      endDate: "",
    });
    if (priorUnendedLeases.length > 0) {
      const descending = priorUnendedLeases.sort((a, b) =>
        Arr.compareForSort(b.value("startDate"), a.value("startDate")),
      );
      return descending[0].values(leaseAmountValueNames);
    }

    const priorEndedLeases = this.leaseSheet.rowsFiltered({ householdId });
    if (priorEndedLeases.length > 0) {
      const descending = priorEndedLeases.sort((a, b) =>
        Arr.compareForSort(b.value("endDate"), a.value("endDate")),
      );
      return descending[0].values(leaseAmountValueNames);
    }

    return {};
  }
  private endActiveLeases(householdId: string, endDate: Date): void {
    const householdLeases = this.leaseSheet.rowsFiltered({
      householdId,
      endDate: "",
    });
    householdLeases.forEach((lease) => {
      lease.setValue("endDate", utils.date.getDayBefore(endDate));
    });
  }
  updateSubsidyOngoingCharges() {
    const subsidyContract = this.sheet("subsidyContract");
    const ssChargeOngoing = this.sheet("scChargeOngoing");

    subsidyContract.orderedRows.forEach((row) => {
      const dateNext = row.value("rentPortionDateNext");
      if (utils.date.isDateAndTodayOrPassed(dateNext)) {
        const dayBefore = utils.date.getDayBefore(dateNext);
        const chargesToEnd = ssChargeOngoing.rowsFiltered({
          description: "Rent charge (base)",
          subsidyContractId: row.value("id"),
          endDate: "",
        });
        chargesToEnd.forEach((charge) => {
          charge.setValue("endDate", dayBefore);
        });

        ssChargeOngoing.addRowWithValues({
          startDate: dateNext,
          amount: row.value("rentPortionMonthlyNext"),
          description: "Rent charge (base)",
          endDate: "",
          subsidyContractId: row.value("id"),
          householdId: row.value("householdId"),
          unitId: row.value("unitId"),
          paymentGroupId: row.value("paymentGroupId"),
        });
        row.setValues({
          rentPortionDateNext: "",
          rentPortionMonthlyNext: "",
        });
      }
    });
  }
}
