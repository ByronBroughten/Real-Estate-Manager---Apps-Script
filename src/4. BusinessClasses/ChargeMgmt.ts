import type { TableValues } from "../0. spreadsheetMetaData/5. allColumnAttributes";
import { OperatorBase } from "../3. SpreadsheetNamed/ClassBases/OperatorBase";
import type { Row } from "../3. SpreadsheetNamed/RowNamed";
import type { SheetNamed } from "../3. SpreadsheetNamed/SheetNamed";
import { utils } from "../utilitiesGeneral";
import { Arr } from "../utils/Arr";
import type { MonthYear } from "../utils/Dat";
import { Obj, type StrictPick } from "../utils/Obj";

export const chargeVarbToDescriptor = {
  rentChargeBaseMonthly: "Rent charge (base)",
  rentChargeUtilitiesMonthly: "Rent charge (utilities)",
  petFeeRecurring: "Pet fee (recurring)",
  caretakerRentReduction: "Caretaker rent reduction",
} as const;

export const leaseChargeVarbNames = Obj.keys(chargeVarbToDescriptor);

interface HhIdMonthYear extends MonthYear {
  householdId: string;
}
type SharedChargeLeaseValues = StrictPick<
  TableValues<"occCharge">,
  | "amount"
  | "portion"
  | "date"
  | "description"
  | "householdId"
  | "unitId"
  | "notes"
>;

export class ChargeMgmt extends OperatorBase {
  addOccChargeOnetime(values: TableValues<"addOccChargeOnetime">) {
    const relevant = Obj.strictOmit(
      values,
      "baseId",
      "enter",
      "enterStatus",
      "householdName",
    );
    const sOnetime = this.ss.sheet("occCharge");
    sOnetime.addRowWithValues(relevant);
    this.ss.gatherRequestsAndBatchUpdate();
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
    const occCharge = this.sheet("occCharge");
    const occupancyTerms = this.sheet("occupancyTerms");

    const occCharges = occCharge.rowsFiltered({ householdId });
    const occupancyTermss = occupancyTerms.rowsFiltered({ householdId });

    let firstDate: Date = new Date();
    let lastDate: Date = new Date();

    if (occCharges.length > 0) {
      occCharges.sort((a, b) =>
        Arr.compareForSort(a.valueDate("date"), b.valueDate("date")),
      );
      firstDate = occCharges[0].valueDate("date");
      lastDate = Arr.lastOrThrow(occCharges).valueDate("date");
    }

    if (occupancyTermss.length > 0) {
      occupancyTermss.sort((a, b) =>
        Arr.compareForSort(a.valueDate("startDate"), b.valueDate("startDate")),
      )[0];
      const earliestStart = occupancyTermss[0].valueDate("startDate");
      if (earliestStart < firstDate) {
        firstDate = earliestStart;
      }

      const latestStart =
        Arr.lastOrThrow(occupancyTermss).valueDate("startDate");
      if (latestStart > lastDate) {
        lastDate = latestStart;
      }

      occupancyTermss.sort((a, b) =>
        Arr.compareForSort(a.valueDate("endDate"), b.valueDate("endDate")),
      );
      const latestEnd = Arr.lastOrThrow(occupancyTermss).valueDate("endDate");
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
  }): Row<"occCharge">[] {
    const occCharge = this.sheet("occCharge");
    return occCharge.orderedRows.filter((row) => {
      const date = row.valueDate("date");
      return (
        row.value("householdId") === householdId &&
        utils.date.isInMonthAndYear(date, month, year) &&
      );
    });
  }
  private getActiveLeasesAndContracts({
    householdId,
    month,
    year,
  }: HhIdMonthYear): {
    activeoccupancyTermss: Row<"occupancyTerms">[];
    activeScCharges: Row<"subsidyContract">[];
  } {
    const occupancyTerms = this.sheet("occupancyTerms");
    const subsidyContract = this.sheet("subsidyContract");
    const activeoccupancyTermss = this.getActives({
      sheet: occupancyTerms,
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
    if (activeoccupancyTermss.length > 1 || activeScCharges.length > 1) {
      throw new Error(
        "Multiple active leases or subsidy contracts for household in month. Cannot accurately update charges.",
      );
    }
    return { activeoccupancyTermss, activeScCharges };
  }
  private getActives<TN extends "occupancyTerms" | "subsidyContract">({
    sheet,
    householdId,
    month,
    year,
  }: {
    sheet: SheetNamed<TN>;
    householdId: string;
    month: number;
    year: number;
  }): Row<TN>[] {
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
    const occCharge = this.sheet("occCharge");

    this.markChargesOfMonthForDelete({
      householdId,
      month,
      year,
    });

    const { activeoccupancyTermss, activeScCharges } =
      this.getActiveLeasesAndContracts({
        householdId,
        month,
        year,
      });

    const { firstOfMonth, lastOfMonth } = utils.date.firstAndLastOfMonthNext({
      month,
      year,
    });

    for (const lease of activeoccupancyTermss) {
      const startDate = lease.valueDate("startDate");
      const endDate = lease.dateValueOrGivenDate("endDate", lastOfMonth);

      for (const columnName of leaseChargeVarbNames) {
        const fullAmount = lease.valueNumber(columnName);
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
          description: chargeVarbToDescriptor[columnName],
          householdId,
          unitId: lease.value("unitId"),
          notes: isProrated
            ? `Prorated from ${startDate.toDateString()} to ${endDate.toDateString}`
            : "",
        };
        switch (columnName) {
          case "petFeeRecurring": {
            occCharge.addRowWithValues(sharedValues);
          }
          case "rentChargeUtilitiesMonthly": {
            occCharge.addRowWithValues(sharedValues);
          }
          case "rentChargeBaseMonthly": {
            this.handleRentChargeBaseMonthly({
              proratedRentTotal: proratedAmount,
              sharedChargeValues: sharedValues,
              month,
              year,
              activeoccupancyTermss,
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
            throw new Error(`Unhandled varb name: ${columnName}`);
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
    activeoccupancyTermss,
    activeScCharges,
  }: {
    proratedRentTotal: number;
    sharedChargeValues: SharedChargeLeaseValues;
    month: number;
    year: number;
    activeoccupancyTermss: Row<"occupancyTerms">[];
    activeScCharges: Row<"subsidyContract">[];
  }) {
    const occCharge = this.sheet("occCharge");

    if (activeoccupancyTermss.length > 0) {
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
      occCharge.addRowWithValues({
        ...sharedChargeValues,
        amount: prorated,
        portion: "Subsidy program",
        description: "Rent charge (base)",
        subsidyAgreementId: scContract.id,
        unitId: scContract.value("unitId"),
      });
    }
    const tenantPortion = proratedRentTotal - proratedSubsidyTotal;
    occCharge.addRowWithValues({
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
    const payment = this.ss.sheet("occPayment");
    const allocation = this.ss.sheet("occPayAllocation");
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
