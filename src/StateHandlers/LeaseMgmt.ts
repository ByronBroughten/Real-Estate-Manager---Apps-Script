import type { SectionValues } from "../appSchema/1. attributes/varbAttributes";
import { dateU } from "../DateU";
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

export class LeaseMgmt extends OperatorBase {
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
  doPeriodicLeaseUpdates() {
    const household = this.sheet("household");
    household.orderedRows.forEach((hh) => {
      const dateNext = hh.value("rentChangeDateNext");
      if (dateU.isDateAndTodayOrPassed(dateNext)) {
        const householdId = hh.value("id");
        const rentChargeNext = hh.valueNumber("rentChargeMonthlyNext");
        const utilityChargeNext = hh.valueNumber("utilityChargeMonthlyNext");
        this.addLease({
          householdId,
          unitId: hh.value("unitId"),
          startDate: dateNext,
          fillBlankValuesWithPriorLease: "yes",
          endPriorActiveLeases: "yes",
          rentChargeBaseMonthly: rentChargeNext,
          rentChargeUtilitiesMonthly: utilityChargeNext,
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
    endPriorActiveLeases = "yes",
    fillBlankValuesWithPriorLease = "yes",
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
      this.endActiveLeases(householdId, dateU.getDayBefore(startDate));
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
      lease.setValue("endDate", endDate);
    });
  }
}
