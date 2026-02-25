import { type SectionName } from "./appSchema/1. attributes/sectionAttributes";
import {
  chargeVarbToDescriptor,
  leaseChargeVarbNames,
} from "./appSchema/1. attributes/valueAttributes/pairs";
import { isUnionValueNoEmpty } from "./appSchema/1. attributes/valueAttributes/unionValues";
import type {
  SectionValues,
  VarbName,
} from "./appSchema/1. attributes/varbAttributes";
import {
  SpreadsheetBase,
  type SpreadsheetProps,
} from "./StateHandlers/HandlerBases/SpreadsheetBase";
import type { Row } from "./StateHandlers/Row";
import type { Sheet } from "./StateHandlers/Sheet";
import { Spreadsheet } from "./StateHandlers/Spreadsheet";
import { utils, type MonthYear } from "./utilitiesGeneral";
import { Arr } from "./utils/Arr";
import { Obj, type StrictPick } from "./utils/Obj";

interface TopOperatorProps extends SpreadsheetProps {
  ss: Spreadsheet;
}

type PaymentIdToCharges = Record<string, Row<"hhCharge">[]>;

type LedgerInputSn = "hhCharge" | "hhPaymentAllocation";

type ChargeIdsForPayments = {
  paymentGroup: {
    [paymentGroupId: string]: string[];
  };
  subsidyContract: {
    [subsidyContractId: string]: string[];
  };
  household: {
    [householdId: string]: string[];
  };
};
type PaymentGroupType = keyof ChargeIdsForPayments;

type Dates = {
  firstOfMonth: Date;
  lastOfMonth: Date;
};

interface HhIdMonthYear extends MonthYear {
  householdId: string;
}

function proratedPortion<
  SN extends "hhLeaseChargeOngoing" | "scChargeOngoing",
  VN extends VarbName<SN>,
>(row: Row<SN>, varbName: VN, dates: Dates): number {
  const startDate = row.dateValueAfterOrGivenDate(
    "startDate",
    dates.firstOfMonth,
  );
  const endDate = row.dateValueBeforeOrGivenDate("endDate", dates.lastOfMonth);
  return utils.dateNext.proratedMonthlyAmount({
    amount: row.valueNumber(varbName),
    startDate,
    endDate,
    month: dates.firstOfMonth.getMonth() + 1,
    year: dates.firstOfMonth.getFullYear(),
  });
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

export class TopOperator extends SpreadsheetBase {
  readonly ss: Spreadsheet;
  constructor({ ss, ...props }: TopOperatorProps) {
    super(props);
    this.ss = ss;
  }
  static test() {
    return "test";
  }
  static init() {
    const ss = Spreadsheet.init();
    return new TopOperator({ ...ss.spreadsheetProps, ss });
  }

  sheet<SN extends SectionName>(sectionName: SN): Sheet<SN> {
    return this.ss.sheet(sectionName);
  }

  addRecurringTransaction() {
    // implement this for updating rent amount
  }
  headerByIdx(idx: number) {
    this.ss.sectionsSchema;
  }
  // APIs
  addExpense(values: SectionValues<"addExpense">) {
    const expense = this.ss.sheet("expense");
    const hhCharge = this.ss.sheet("hhCharge");

    const { expenseNotes, ...expenseVals } = Obj.strictPick(values, [
      "date",
      "amount",
      "billerName",
      "description",
      "expenseCategory",
      "hhChargeLesserAmount",
      "propertyId",
      "receiptFormat",
      "taxAdjust",
      "unitId",
      "expenseNotes",
    ]);

    const expenseId = expense.addRowWithValues({
      ...expenseVals,
      notes: expenseNotes,
    });

    if (values.hhToChargeName) {
      if (!values.householdId) {
        throw new Error("Household ID is required");
      }

      const { amount, hhChargeLesserAmount, hhChargeNotes, ...hhChargeVals } =
        Obj.strictPick(values, [
          "householdId",
          "date",
          "amount",
          "hhChargeLesserAmount",
          "unitId",
          "hhChargeNotes",
        ]);
      hhCharge.addRowWithValues({
        expenseId,
        amount: hhChargeLesserAmount === "" ? amount : hhChargeLesserAmount,
        description: "Damage, waste, or service",
        portion: "Household",
        ...hhChargeVals,
        notes: hhChargeNotes,
      });
    }
    this.ss.batchUpdateRanges();
  }
  addHhPaymentOnetime(values: SectionValues<"addHhPaymentOnetime">) {
    const hhPayment = this.ss.sheet("hhPayment");
    const hhAllocation = this.ss.sheet("hhPaymentAllocation");
    const payerValues = Obj.strictPick(values, [
      "date",
      "amount",
      "payerCategory",
      "detailsVerified",
      "paymentHhId",
      "subsidyProgramId",
      "otherPayerId",
    ]);

    switch (payerValues.payerCategory) {
      case "Household":
        if (!payerValues.paymentHhId) {
          throw new Error("Household ID is required");
        }
        break;
      case "Subsidy program":
        if (!payerValues.subsidyProgramId) {
          throw new Error("Subsidy program ID is required");
        }
        break;
      case "Other payer":
        if (!payerValues.otherPayerId) {
          throw new Error("Other payer ID is required");
        }
        break;
      default: {
        throw new Error("Payer category is required");
      }
    }

    const paymentId = hhPayment.addRowWithValues({
      ...payerValues,
      ...(payerValues.paymentHhId && { householdId: payerValues.paymentHhId }),
    });

    const allocateValues = Obj.strictPick(values, [
      "householdId",
      "portion",
      "description",
      "amount",
      "unitId",
      "subsidyContractId",
    ]);

    if (allocateValues.portion === "Subsidy program") {
      if (!allocateValues.subsidyContractId) {
        throw new Error("Subsidy contract ID is required");
      }
    }

    hhAllocation.addRowWithValues({
      ...allocateValues,
      paymentId,
    });
    this.ss.batchUpdateRanges();
  }
  addHhChargeOnetime(values: SectionValues<"addHhChargeOnetime">) {
    const relevant = Obj.strictOmit(values, "id", "enter", "householdName");
    const sOnetime = this.ss.sheet("hhCharge");
    sOnetime.addRowWithValues(relevant);
    this.ss.batchUpdateRanges();
  }
  buildHhLedger(values: SectionValues<"buildHhLedger">): void {
    const hhLedger = this.ss.sheet("hhLedger");
    const hhCharge = this.ss.sheet("hhCharge");
    const buildApi = this.ss.sheet("buildHhLedger");
    const hhPaymentAllocation = this.ss.sheet("hhPaymentAllocation");
    hhLedger.DELETE_ALL_BODY_ROWS();

    const { householdId, portion, subsidyContractId } = values;
    function filteredRows<SN extends LedgerInputSn>(
      sheet: Sheet<SN>,
    ): Row<SN>[] {
      const rows = sheet.orderedRows;
      return rows.filter((row) => {
        const vals = row.values([
          "portion",
          "householdId",
          "subsidyContractId",
        ]);
        if (householdId === vals.householdId && portion === vals.portion) {
          if (portion === "Subsidy program") {
            return subsidyContractId === vals.subsidyContractId;
          } else {
            return true;
          }
        } else {
          return false;
        }
      });
    }

    const filteredCharges = filteredRows(hhCharge);
    for (const row of filteredCharges) {
      const { amount, ...rest } = row.values([
        "amount",
        "date",
        "description",
        "unitName",
      ]);
      hhLedger.addRowWithValues({
        issuer: "Property management",
        charge: amount,
        payment: "",
        notes: "",
        ...rest,
      });
    }

    const filteredAllocations = filteredRows(hhPaymentAllocation);
    for (const row of filteredAllocations) {
      if (row.value("processed") === "No") {
        continue;
      }
      const { amount, payer, ...rest } = row.values([
        "amount",
        "payer",
        "date",
        "description",
        "unitName",
      ]);
      hhLedger.addRowWithValues({
        issuer: payer,
        payment: amount,
        charge: "",
        notes: "",
        ...rest,
      });
    }

    hhLedger.sort("date");
    buildApi.topBodyRow.setValues({
      dateLastRan: new Date(),
      hhIdLastRan: values.householdId,
    });
    this.ss.batchUpdateRanges();
  }

  monthlyRentUpdate() {
    this.updateLeaseOngoingCharges();
    this.updateSubsidyOngoingCharges();
    this.ss.batchUpdateRanges();
    // needed for accurately building out charges

    const cfp = this.buildOutChargesForMonth();
    this.buildOutPaymentsFromCharges(cfp);
    this.ss.batchUpdateRanges();
  }
  updateLeaseOngoingCharges() {
    const household = this.ss.sheet("household");
    const leaseChargeOngoing = this.ss.sheet("hhLeaseChargeOngoing");

    household.orderedRows.forEach((hh) => {
      const dateNext = hh.value("rentIncreaseDateNext");

      if (utils.dateNext.isDateAndTodayOrPassed(dateNext)) {
        const rentChargeNext = hh.valueNumber("rentChargeMonthlyNext");
        const utilityChargeNext = hh.value("utilityChargeMonthlyNext");

        const dayBefore = utils.dateNext.getDayBefore(dateNext);
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
          rentChange: "Yes",
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
  updateSubsidyOngoingCharges() {
    const subsidyContract = this.ss.sheet("subsidyContract");
    const ssChargeOngoing = this.ss.sheet("scChargeOngoing");

    subsidyContract.orderedRows.forEach((row) => {
      const dateNext = row.value("rentPortionDateNext");
      if (utils.dateNext.isDateAndTodayOrPassed(dateNext)) {
        const dayBefore = utils.dateNext.getDayBefore(dateNext);
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
  updateHhAllOngoingCharges(
    householdIds: string[] = this.sheet("household").orderedRows.map((r) =>
      r.value("id"),
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

      const monthYears = utils.dateNext.monthYearsOnAndBetween({
        startMonthYear,
        endMonthYear,
      });

      this.updateAllHhOngoingChargesInSpan({
        householdIds: [householdId],
        monthYears,
      });
    }
  }
  private getFirstLastDateToUpdateCharges(householdId: string): {
    firstDate: Date;
    lastDate: Date;
  } {
    const hhCharge = this.sheet("hhCharge");
    const hhLease = this.sheet("hhLeaseChargeOngoing");

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
        utils.dateNext.isInMonthAndYear(date, month, year) &&
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
    activeHhLeases: Row<"hhLeaseChargeOngoing">[];
    activeScCharges: Row<"scChargeOngoing">[];
  } {
    const hhLease = this.sheet("hhLeaseChargeOngoing");
    const scChargeOngoing = this.sheet("scChargeOngoing");
    const activeHhLeases = this.getActives({
      sheet: hhLease,
      householdId,
      month,
      year,
    });
    const activeScCharges = this.getActives({
      sheet: scChargeOngoing,
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
  private getActives<SN extends "hhLeaseChargeOngoing" | "scChargeOngoing">({
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
    const firstOfMonth = utils.dateNext.firstDayOfMonthNext({ month, year });
    const lastOfMonth = utils.dateNext.lastDayOfMonthNext({ month, year });
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
        utils.dateNext.isDateSameOrBefore(startDate, lastOfMonth) &&
        utils.dateNext.isDateSameOrAfter(endDate, firstOfMonth)
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

    const { firstOfMonth, lastOfMonth } =
      utils.dateNext.firstAndLastOfMonthNext({ month, year });

    for (const lease of activeHhLeases) {
      const startDate = lease.valueDate("startDate");
      const endDate = lease.dateValueOrGivenDate("endDate", lastOfMonth);

      for (const varbName of leaseChargeVarbNames) {
        const fullAmount = lease.valueNumber(varbName);
        if (fullAmount === 0) {
          continue; // skip lease charges of $0.
        }

        const { proratedAmount, isProrated } = utils.dateNext.prorateds({
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
            hhCharge.addRowWithValues({
              ...sharedValues,
              petId: lease.value("petId"),
            });
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
    activeHhLeases: Row<"hhLeaseChargeOngoing">[];
    activeScCharges: Row<"scChargeOngoing">[];
  }) {
    const hhCharge = this.sheet("hhCharge");

    if (activeHhLeases.length > 0) {
      throw new Error(
        "This can only handle one active lease per month for now.",
      );
    }

    const lastDayOfMonth = utils.dateNext.lastDayOfMonthNext({ month, year });

    let proratedSubsidyTotal = 0;
    for (const scContract of activeScCharges) {
      const fullAmount = scContract.valueNumber("amount");
      if (fullAmount === 0) {
        continue;
      }
      const prorated = utils.dateNext.proratedMonthlyAmount({
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
        subsidyContractId: scContract.value("id"),
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

  buildOutChargesForMonth(date: Date = new Date()) {
    //depreciated
    const cfp: ChargeIdsForPayments = {
      paymentGroup: {},
      subsidyContract: {},
      household: {},
    };

    const { firstOfMonth, lastOfMonth } =
      utils.dateNext.firstAndLastDayOfMonth(date);

    const household = this.ss.sheet("household");
    const scChargeOngoing = this.ss.sheet("scChargeOngoing");
    const hhLeaseOngoing = this.ss.sheet("hhLeaseChargeOngoing");
    const charge = this.ss.sheet("hhCharge");

    function getActives<SN extends "hhLeaseChargeOngoing" | "scChargeOngoing">(
      householdId: string,
      sheet: Sheet<SN>,
    ): Row<SN>[] {
      return sheet.orderedRows.filter((row) => {
        const startDate = row.valueDate("startDate");
        const endDate = row.dateValueOrGivenDate("endDate", lastOfMonth);
        // The start date needs to be on or before the last day of the month
        // The end date needs to be on or after the first day of the month
        return (
          row.value("householdId") === householdId &&
          utils.dateNext.isDateSameOrBefore(startDate, lastOfMonth) &&
          utils.dateNext.isDateSameOrAfter(endDate, firstOfMonth)
        );
      });
    }

    household.orderedRows.forEach((hh) => {
      const householdId = hh.value("id");

      const hhLeasesActiveThisMonth = getActives(householdId, hhLeaseOngoing);
      const scChargesActiveThisMonth = getActives(householdId, scChargeOngoing);

      const varbNames = Obj.keys(chargeVarbToDescriptor);
      for (const varbName of varbNames) {
        let householdPortion = 0;

        // TODO: Account for if a tenant switches units mid-month
        // TODO: Divvy subsidy charges by subsidy contract if there are multiple.
        // TODO: Make separate ongoing charges for pet fees
        const firstUnitId = hhLeasesActiveThisMonth[0].value("unitId");

        const chargeProps = {
          date: firstOfMonth,
          unitId: firstUnitId,
          householdId,
        } as const;

        for (const lease of hhLeasesActiveThisMonth) {
          householdPortion += proratedPortion(lease, varbName, {
            firstOfMonth,
            lastOfMonth,
          });
        }

        if (varbName === "caretakerRentReduction") {
          if (householdPortion > 0) {
            this.handleCaretakerRentReduction({
              amount: householdPortion,
              date: firstOfMonth,
              householdId,
              unitId: firstUnitId,
            });
          }
          continue;
        }
        if (varbName === "rentChargeBaseMonthly") {
          let subsidyPortion = 0;
          for (const scContract of scChargesActiveThisMonth) {
            subsidyPortion += proratedPortion(scContract, "amount", {
              firstOfMonth,
              lastOfMonth,
            });
          }
          if (subsidyPortion) {
            const topScCharge = scChargesActiveThisMonth[0];
            householdPortion -= subsidyPortion;
            const chargeId = charge.addRowWithValues({
              portion: "Subsidy program",
              description: "Rent charge (base)",
              subsidyContractId: topScCharge.value("subsidyContractId"),
              amount: subsidyPortion,
              ...chargeProps,
            });
            const paymentGroupId =
              scChargesActiveThisMonth[0].value("paymentGroupId");
            if (paymentGroupId) {
              Obj.pushByKey(cfp.paymentGroup, paymentGroupId, chargeId);
            } else {
              for (const scContract of scChargesActiveThisMonth) {
                Obj.pushByKey(
                  cfp.subsidyContract,
                  scContract.value("id"),
                  chargeId,
                );
              }
            }
          }
        }

        if (householdPortion !== 0) {
          const chargId = charge.addRowWithValues({
            amount: householdPortion,
            portion: "Household",
            description: chargeVarbToDescriptor[varbName],
            ...chargeProps,
          });
          Obj.pushByKey(cfp.household, householdId, chargId);
        }
      }
    });
    return cfp;
  }
  buildOutPaymentsFromCharges(cfp: ChargeIdsForPayments) {
    for (const paymentGroupType of [
      "household",
      "subsidyContract",
      "paymentGroup",
    ] as const) {
      this.addPaymentsAndAllocate({
        paymentGroupType,
        idToChargeIds: cfp[paymentGroupType],
      });
    }
  }
  addPaymentsAndAllocate({
    paymentGroupType,
    idToChargeIds,
  }: {
    paymentGroupType: PaymentGroupType;
    idToChargeIds: { [id: string]: string[] };
  }) {
    const hhCharge = this.ss.sheet("hhCharge");
    const payment = this.ss.sheet("hhPayment");
    const paymentGroup = this.ss.sheet("paymentGroup");
    const subsidyContract = this.ss.sheet("subsidyContract");

    const paymentIdToCharges: PaymentIdToCharges = {};
    for (const [groupId, chargeIds] of Obj.entries(idToChargeIds)) {
      const charges = chargeIds.map((chargeId) => hhCharge.row(chargeId));
      function addPayment(values: Partial<SectionValues<"hhPayment">>) {
        const topCharge = charges[0];
        const paymentId = payment.addRowWithValues({
          detailsVerified: "No",
          amount: 0,
          date: topCharge.value("date"),
          ...values,
        });

        let amount = 0;
        for (const charge of charges) {
          amount += charge.valueNumber("amount");
          Obj.pushByKey(paymentIdToCharges, paymentId, charge);
        }
        payment.row(paymentId).setValue("amount", amount);
      }

      const handlers: Record<PaymentGroupType, () => void> = {
        household: () => {
          addPayment({
            payerCategory: "Household",
            householdId: groupId,
          });
        },
        subsidyContract: () => {
          addPayment({
            payerCategory: "Subsidy program",
            subsidyProgramId: subsidyContract
              .row(groupId)
              .value("subsidyProgramId"),
          });
        },
        paymentGroup: () => {
          const pg = paymentGroup.row(groupId);
          addPayment(
            pg.values([
              "householdId",
              "payerCategory",
              "subsidyProgramId",
              "otherPayerId",
            ]),
          );
        },
      };

      handlers[paymentGroupType]();
    }
    this.addAllocations(paymentIdToCharges);
  }
  addAllocations(paymentIdToCharges: PaymentIdToCharges) {
    const allocation = this.ss.sheet("hhPaymentAllocation");
    for (const [paymentId, chargeRows] of Object.entries(paymentIdToCharges)) {
      chargeRows.forEach((charge) => {
        allocation.addRowWithValues({
          paymentId,
          description: "Normal payment",
          ...charge.values([
            "amount",
            "portion",
            "householdId",
            "unitId",
            "subsidyContractId",
          ]),
        });
      });
    }
  }
  // private buildOutAllCharges(): void {
  //   const ss = this.ss;
  //   const hhCharge = ss.sheet("hhCharge");
  //   hhCharge.DELETE_ALL_BODY_ROWS();

  //   this.buildFromChargesOngoing(({ date, proratedAmount, chargeOngoing }) => {
  //     hhCharge.addRowWithValues({
  //       date,
  //       amount: proratedAmount,
  //       chargeOngoingId: chargeOngoing.value("id"),
  //       ...chargeOngoing.values([
  //         "portion",
  //         "description",
  //         "householdId",
  //         "petId",
  //         "subsidyContractId",
  //         "unitId",
  //       ]),
  //     });
  //   });
  //   hhCharge.sortWithoutAddingChanges("subsidyContractId");
  //   hhCharge.sortWithoutAddingChanges("date");
  //   hhCharge.sort("hhMembersFullName");
  //   ss.batchUpdateRanges();
  // }
  test() {
    const date = new Date();
    const datePlusOne = new Date(date.getDate() + 1);
    const dateMinusOne = new Date(date.getDate() - 1);

    const datePlus30 = new Date(date.getDate() + 30);
    const datePlus31 = new Date(date.getDate() + 31);
    const datePlus29 = new Date(date.getDate() + 29);
  }
}
