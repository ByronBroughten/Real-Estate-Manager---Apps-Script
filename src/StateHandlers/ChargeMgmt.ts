import {
  chargeVarbToDescriptor,
  leaseChargeVarbNames,
} from "../appSchema/1. attributes/valueAttributes/pairs";
import { isUnionValueNoEmpty } from "../appSchema/1. attributes/valueAttributes/unionValues";
import type { SectionValues } from "../appSchema/1. attributes/varbAttributes";
import type { MonthYear } from "../DateU";
import { utils } from "../utilitiesGeneral";
import { Arr } from "../utils/Arr";
import { Obj, type StrictPick } from "../utils/Obj";
import { OperatorBase } from "./HandlerBases/OperatorBase";
import type { Row } from "./Row";
import type { Sheet } from "./Sheet";

interface HhIdMonthYear extends MonthYear {
  householdId: string;
}
type SharedChargeLeaseValues = StrictPick<
  SectionValues<"hhCharge">,
  | "amount"
  | "portion"
  | "date"
  | "description"
  | "householdId"
  | "unitId"
  | "notes"
>;

export class ChargeMgmt extends OperatorBase {
  addHhChargeOnetime(values: SectionValues<"addHhChargeOnetime">) {
    const relevant = Obj.strictOmit(
      values,
      "id",
      "baseId",
      "enter",
      "enterStatus",
      "householdName",
    );
    const sOnetime = this.ss.sheet("hhCharge");
    sOnetime.addRowWithValues(relevant);
    this.ss.batchUpdateRanges();
  }
  updateHhAllOngoingCharges(
    householdIds: string[] = this.sheet("household").orderedRows.map(
      (r) => r.id,
    ),
  ) {
    for (const householdId of householdIds) {
      const { firstDate, lastDate } =
        this.getFirstLastDateToUpdateCharges(householdId);
      const startMonthYear = {
        month: firstDate.getMonth() + 1,
        year: firstDate.getFullYear(),
      };

      const endMonthYear = {
        month: lastDate.getMonth() + 1,
        year: lastDate.getFullYear(),
      };

      const monthYears = utils.date.monthYearsOnAndBetween({
        startMonthYear,
        endMonthYear,
      });

      this.updateAllHhOngoingChargesInSpan({
        householdIds: [householdId],
        monthYears,
      });
    }
  }
  updateAllHhOngoingChargesInSpan({
    householdIds,
    monthYears,
  }: {
    householdIds: string[];
    monthYears: MonthYear[];
  }) {
    householdIds.forEach((householdId) => {
      monthYears.forEach(({ month, year }) => {
        this.updateHhOneMonthCharges({
          householdId,
          month,
          year,
        });
      });
    });
  }
  private getFirstLastDateToUpdateCharges(householdId: string): {
    firstDate: Date;
    lastDate: Date;
  } {
    const hhCharge = this.sheet("hhCharge");
    const hhLease = this.sheet("hhLease");

    const hhCharges = hhCharge.rowsFiltered({ householdId });
    const hhLeases = hhLease.rowsFiltered({ householdId });

    let firstDate: Date = new Date();
    let lastDate: Date = new Date();

    if (hhCharges.length > 0) {
      hhCharges.sort((a, b) =>
        Arr.compareForSort(a.valueDate("date"), b.valueDate("date")),
      );
      firstDate = hhCharges[0].valueDate("date");
      lastDate = Arr.lastOrThrow(hhCharges).valueDate("date");
    }

    if (hhLeases.length > 0) {
      hhLeases.sort((a, b) =>
        Arr.compareForSort(a.valueDate("startDate"), b.valueDate("startDate")),
      )[0];
      const earliestStart = hhLeases[0].valueDate("startDate");
      if (earliestStart < firstDate) {
        firstDate = earliestStart;
      }

      const latestStart = Arr.lastOrThrow(hhLeases).valueDate("startDate");
      if (latestStart > lastDate) {
        lastDate = latestStart;
      }

      hhLeases.sort((a, b) =>
        Arr.compareForSort(a.valueDate("endDate"), b.valueDate("endDate")),
      );
      const latestEnd = Arr.lastOrThrow(hhLeases).valueDate("endDate");
      if (latestEnd > lastDate) {
        lastDate = latestEnd;
      }
    }
    return { firstDate, lastDate };
  }
  private markChargesOfMonthForDelete({
    householdId,
    month,
    year,
  }: HhIdMonthYear) {
    const ongoingChargesOfMonth = this.getOngoingChargesOfMonth({
      householdId,
      month,
      year,
    });
    for (const charge of ongoingChargesOfMonth) {
      charge.markForDelete();
    }
  }
  private getOngoingChargesOfMonth({
    householdId,
    month,
    year,
  }: {
    householdId: string;
    month: number;
    year: number;
  }): Row<"hhCharge">[] {
    const hhCharge = this.sheet("hhCharge");
    return hhCharge.orderedRows.filter((row) => {
      const date = row.valueDate("date");
      return (
        row.value("householdId") === householdId &&
        utils.date.isInMonthAndYear(date, month, year) &&
        isUnionValueNoEmpty(
          row.value("description"),
          "descriptionChargeOngoing",
        )
      );
    });
  }
  private getActiveLeasesAndContracts({
    householdId,
    month,
    year,
  }: HhIdMonthYear): {
    activeHhLeases: Row<"hhLease">[];
    activeScCharges: Row<"subsidyContract">[];
  } {
    const hhLease = this.sheet("hhLease");
    const subsidyContract = this.sheet("subsidyContract");
    const activeHhLeases = this.getActives({
      sheet: hhLease,
      householdId,
      month,
      year,
    });
    const activeScCharges = this.getActives({
      sheet: subsidyContract,
      householdId,
      month,
      year,
    });
    if (activeHhLeases.length > 1 || activeScCharges.length > 1) {
      throw new Error(
        "Multiple active leases or subsidy contracts for household in month. Cannot accurately update charges.",
      );
    }
    return { activeHhLeases, activeScCharges };
  }
  private getActives<SN extends "hhLease" | "subsidyContract">({
    sheet,
    householdId,
    month,
    year,
  }: {
    sheet: Sheet<SN>;
    householdId: string;
    month: number;
    year: number;
  }): Row<SN>[] {
    const firstOfMonth = utils.date.firstDayOfMonthNext({ month, year });
    const lastOfMonth = utils.date.lastDayOfMonthNext({ month, year });
    return sheet.orderedRows.filter((row) => {
      const startDate = row.valueDate("startDate");
      const endDate = row.dateValueOrGivenDate("endDate", lastOfMonth);
      if (startDate > endDate) {
        throw new Error("Start date cannot be after end date.");
      }
      // The start date needs to be on or before the last day of the month
      // The end date needs to be on or after the first day of the month
      return (
        row.value("householdId") === householdId &&
        utils.date.isDateSameOrBefore(startDate, lastOfMonth) &&
        utils.date.isDateSameOrAfter(endDate, firstOfMonth)
      );
    });
  }
  private updateHhOneMonthCharges({ householdId, month, year }: HhIdMonthYear) {
    const hhCharge = this.sheet("hhCharge");

    this.markChargesOfMonthForDelete({
      householdId,
      month,
      year,
    });

    const { activeHhLeases, activeScCharges } =
      this.getActiveLeasesAndContracts({
        householdId,
        month,
        year,
      });

    const { firstOfMonth, lastOfMonth } = utils.date.firstAndLastOfMonthNext({
      month,
      year,
    });

    for (const lease of activeHhLeases) {
      const startDate = lease.valueDate("startDate");
      const endDate = lease.dateValueOrGivenDate("endDate", lastOfMonth);

      for (const varbName of leaseChargeVarbNames) {
        const fullAmount = lease.valueNumber(varbName);
        if (fullAmount === 0) {
          continue; // skip lease charges of $0.
        }

        const { proratedAmount, isProrated } = utils.date.prorateds({
          amount: fullAmount,
          startDate,
          endDate,
          month,
          year,
        });

        const sharedValues: SharedChargeLeaseValues = {
          amount: proratedAmount,
          portion: "Household",
          date: firstOfMonth,
          description: chargeVarbToDescriptor[varbName],
          householdId,
          unitId: lease.value("unitId"),
          notes: isProrated
            ? `Prorated from ${startDate.toDateString()} to ${endDate.toDateString}`
            : "",
        };
        switch (varbName) {
          case "petFeeRecurring": {
            hhCharge.addRowWithValues(sharedValues);
          }
          case "rentChargeUtilitiesMonthly": {
            hhCharge.addRowWithValues(sharedValues);
          }
          case "rentChargeBaseMonthly": {
            this.handleRentChargeBaseMonthly({
              proratedRentTotal: proratedAmount,
              sharedChargeValues: sharedValues,
              month,
              year,
              activeHhLeases,
              activeScCharges,
            });
          }
          case "caretakerRentReduction": {
            this.handleCaretakerRentReduction({
              amount: proratedAmount,
              date: firstOfMonth,
              householdId,
              unitId: lease.value("unitId"),
            });
          }
          default: {
            throw new Error(`Unhandled varb name: ${varbName}`);
          }
        }
      }
    }
  }
  private handleRentChargeBaseMonthly({
    month,
    year,
    sharedChargeValues,
    proratedRentTotal,
    activeHhLeases,
    activeScCharges,
  }: {
    proratedRentTotal: number;
    sharedChargeValues: SharedChargeLeaseValues;
    month: number;
    year: number;
    activeHhLeases: Row<"hhLease">[];
    activeScCharges: Row<"subsidyContract">[];
  }) {
    const hhCharge = this.sheet("hhCharge");

    if (activeHhLeases.length > 0) {
      throw new Error(
        "This can only handle one active lease per month for now.",
      );
    }

    const lastDayOfMonth = utils.date.lastDayOfMonthNext({ month, year });

    let proratedSubsidyTotal = 0;
    for (const scContract of activeScCharges) {
      const fullAmount = scContract.valueNumber("rentChargeBaseMonthly");
      if (fullAmount === 0) {
        continue;
      }
      const prorated = utils.date.proratedMonthlyAmount({
        amount: fullAmount,
        startDate: scContract.valueDate("startDate"),
        endDate: scContract.dateValueOrGivenDate("endDate", lastDayOfMonth),
        month,
        year,
      });
      proratedSubsidyTotal += prorated;
      hhCharge.addRowWithValues({
        ...sharedChargeValues,
        amount: prorated,
        portion: "Subsidy program",
        description: "Rent charge (base)",
        subsidyAgreementId: scContract.id,
        unitId: scContract.value("unitId"),
      });
    }
    const tenantPortion = proratedRentTotal - proratedSubsidyTotal;
    hhCharge.addRowWithValues({
      ...sharedChargeValues,
      amount: tenantPortion,
      portion: "Household",
      description: "Rent charge (base)",
    });
  }
  private handleCaretakerRentReduction({
    amount,
    date,
    householdId,
    unitId,
  }: {
    amount: number;
    date: Date;
    householdId: string;
    unitId: string;
  }) {
    const payment = this.ss.sheet("hhPayment");
    const allocation = this.ss.sheet("hhPaymentAllocation");
    const expense = this.ss.sheet("expense");

    const paymentId = payment.addRowWithValues({
      date,
      amount,
      payerCategory: "Rent reduction",
      detailsVerified: "No",
    });

    allocation.addRowWithValues({
      amount,
      householdId,
      description: "Caretaker rent reduction",
      paymentId,
      portion: "Household",
      unitId,
    });

    expense.addRowWithValues({
      // TODO add expense
    });
  }
}
