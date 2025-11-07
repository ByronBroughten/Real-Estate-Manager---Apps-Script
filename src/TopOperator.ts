import { type GroupSectionName } from "./appSchema/1. attributes/sectionAttributes";
import type { Value } from "./appSchema/1. attributes/valueAttributes";
import type { SectionValues } from "./appSchema/1. attributes/varbAttributes";
import {
  SpreadsheetBase,
  type SpreadsheetProps,
} from "./StateHandlers/HandlerBases/SpreadsheetBase";
import type { Row } from "./StateHandlers/Row";
import type { Sheet } from "./StateHandlers/Sheet";
import { Spreadsheet } from "./StateHandlers/Spreadsheet";
import { utils } from "./utilitiesGeneral";
import { Obj } from "./utils/Obj";
import { valS } from "./utils/validation";

interface TopOperatorProps extends SpreadsheetProps {
  ss: Spreadsheet;
}

interface BuildFromChargeOngoingProps {
  date: Date;
  proratedAmount: number;
  chargeOngoing: Row<"hhChargeOngoing">;
}

type LedgerInputSn = "hhCharge" | "hhPaymentAllocation";

export class TopOperator extends SpreadsheetBase {
  readonly ss: Spreadsheet;
  constructor({ ss, ...props }: TopOperatorProps) {
    super(props);
    this.ss = ss;
  }
  static init() {
    const ss = Spreadsheet.init();
    return new TopOperator({ ...ss.spreadsheetProps, ss });
  }
  addRecurringTransaction() {
    // implement this for updating rent amount
  }
  isApiEnterTriggered<SN extends GroupSectionName<"api">>(
    sectionName: SN,
    colIdx: number,
    rowIdx: number
  ) {
    const sheet = this.ss.sheet(sectionName);
    const triggerColIdx = sheet.colIdxBase1("enter");
    const triggerRowIdx = sheet.topBodyRowIdxBase1;
    const triggered = colIdx === triggerColIdx && rowIdx === triggerRowIdx;
    return triggered;
  }
  // APIs
  addHhPaymentOnetime(values: SectionValues<"addHhPaymentOnetime">) {
    const payerValues = Obj.strictPick(values, [
      "date",
      "amount",
      "payerCategory",
      "detailsVerified",
      "paymentHhId",
      "subsidyProgramId",
      "otherPayerId",
    ]);

    // Also no amount is getting added to payment

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
    const sPayment = this.ss.sheet("hhPayment");
    const paymentId = sPayment.addRowWithValues({
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

    const sAllocation = this.ss.sheet("hhPaymentAllocation");
    sAllocation.addRowWithValues({
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
    hhLedger.DELETE_ALL_BODY_ROWS();

    const { householdId, portion, subsidyContractId } = values;

    function filter<SN extends LedgerInputSn>(row: Row<SN>): boolean {
      const vals = row.values(["householdId", "portion", "subsidyContractId"]);
      if (vals.householdId === householdId && vals.portion === portion) {
        if (portion === "Household" || !subsidyContractId) {
          return true;
        } else {
          return vals.subsidyContractId === subsidyContractId;
        }
      } else {
        return false;
      }
    }

    function filteredRows<SN extends LedgerInputSn>(
      sheet: Sheet<SN>
    ): Row<SN>[] {
      const rows = sheet.orderedRows;
      const filteredRows = rows.filter((row) => filter(row));
      return filteredRows;
    }

    const filteredCharges = filteredRows(this.ss.sheet("hhCharge"));
    for (const row of filteredCharges) {
      const { amount, ...rest } = row.values([
        "date",
        "amount",
        "description",
        "unitName",
      ]);
      hhLedger.addRowWithValues({
        issuer: "Property management",
        notes: "",
        charge: amount,
        ...rest,
      });
    }

    const filteredAllocations = filteredRows(
      this.ss.sheet("hhPaymentAllocation")
    );
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
        notes: "",
        issuer: payer,
        payment: amount,
        ...rest,
      });
    }

    hhLedger.sort("date");
    this.ss.batchUpdateRanges();
  }
  private buildFromChargesOngoing(
    doUpdate: (props: BuildFromChargeOngoingProps) => void,
    chargesOngoing: Row<"hhChargeOngoing">[] = this.ss.sheet("hhChargeOngoing")
      .orderedRows
  ) {
    chargesOngoing.forEach((chargeOngoing) => {
      const startDate = chargeOngoing.valueDate("startDate");
      const endDateMaybe = chargeOngoing.value("endDate");
      const endDate = endDateMaybe
        ? valS.validate.date(endDateMaybe)
        : utils.date.lastDateOfMonth(new Date());

      const dates = utils.date.firstDaysOfMonths(startDate, endDate);

      for (let i = 0; i < dates.length; i++) {
        const date = dates[i];
        const end =
          i === dates.length - 1 ? endDate : utils.date.lastDateOfMonth(date);

        const proratedAmount = utils.date.prorateMonthlyAmount(
          chargeOngoing.valueNumber("amount"),
          date,
          end
        );

        doUpdate({
          date,
          proratedAmount,
          chargeOngoing,
        });
      }
    });
  }
  monthlyRentUpdate() {
    this.updateSubsidyContractCharges();
    this.ss.batchUpdateRanges();
    // needed for accurate rent portion calculations

    this.updateRentAndUtilityCharges();
    this.ss.batchUpdateRanges();
    // needed for accurately building out charges

    this.buildOutChargesFirstOfMonth();
    this.buildOutPaymentsFirstOfMonth();
    this.ss.batchUpdateRanges();
  }
  updateSubsidyContractCharges() {
    const subsidyContract = this.ss.sheet("subsidyContract");
    const ongoingCharge = this.ss.sheet("hhChargeOngoing");

    subsidyContract.orderedRows.forEach((row) => {
      const dateNext = row.value("rentPortionDateNext");
      if (utils.date.isDateAndTodayOrPassed(dateNext)) {
        const dayBefore = utils.date.getDayBefore(dateNext);
        const chargesToEnd = ongoingCharge.rowsFiltered({
          portion: "Subsidy program",
          description: "Rent charge (base)",
          subsidyContractId: row.value("id"),
          endDate: "",
        });
        chargesToEnd.forEach((charge) => {
          charge.setValue("endDate", dayBefore);
        });

        ongoingCharge.addRowWithValues({
          startDate: dateNext,
          amount: row.value("rentPortionMonthlyNext"),
          description: "Rent charge (base)",
          endDate: "",
          portion: "Subsidy program",
          subsidyContractId: row.value("id"),
          householdId: row.value("householdId"),
          unitId: row.value("unitId"),
          paymentGroupId: row.value("paymentGroupId"),
        });
        row.setValue("rentPortionDateNext", "");
      }
    });
  }
  updateRentAndUtilityCharges() {
    const household = this.ss.sheet("household");
    const ongoingCharge = this.ss.sheet("hhChargeOngoing");

    household.orderedRows.forEach((row) => {
      const dateNext = row.value("rentIncreaseDateNext");
      if (utils.date.isDateAndTodayOrPassed(dateNext)) {
        const dayBefore = utils.date.getDayBefore(dateNext);

        const chargesToEnd = ongoingCharge.rowsFiltered({
          portion: "Household",
          description: "Rent charge (base)",
          householdId: row.value("id"),
          endDate: "",
        });
        chargesToEnd.forEach((charge) => {
          charge.setValue("endDate", dayBefore);
        });
        const rentChargeNext = row.valueNumber("rentChargeMonthlyNext");
        const subsidyPortion = row.valueNumber("subsidyPortionMonthly");
        ongoingCharge.addRowWithValues({
          startDate: dateNext,
          amount: rentChargeNext - subsidyPortion,
          description: "Rent charge (base)",
          portion: "Household",
          endDate: "",
          householdId: row.value("id"),
          unitId: row.value("unitId"),
        });

        const utilityChargeNext = row.valueNumber("utilityChargeMonthlyNext");
        if (utilityChargeNext) {
          const chargesToEnd = ongoingCharge.rowsFiltered({
            portion: "Household",
            description: "Rent charge (utilities)",
            householdId: row.value("id"),
            endDate: "",
          });
          chargesToEnd.forEach((charge) => {
            charge.setValue("endDate", dayBefore);
          });
          ongoingCharge.addRowWithValues({
            startDate: dateNext,
            amount: utilityChargeNext,
            description: "Rent charge (utilities)",
            portion: "Household",
            endDate: "",
            householdId: row.value("id"),
            unitId: row.value("unitId"),
          });
        }

        row.setValues({
          rentChargeMonthly: rentChargeNext,
          rentIncreaseDateLast: dateNext,
          rentChargeNextOverride: "",
          ...(utilityChargeNext && {
            utilityChargeMonthly: utilityChargeNext,
            utilityChargeNextOverride: "",
          }),
        });
      }
    });
  }
  buildOutChargesFirstOfMonth(date: Date = new Date()) {
    const firstOfMonth = utils.date.firstDayOfMonth(date);

    const ongoingCharge = this.ss.sheet("hhChargeOngoing");
    const charge = this.ss.sheet("hhCharge");

    ongoingCharge.orderedRows.forEach((row) => {
      const endDateValue = row.value("endDate");
      const endDate = utils.date.dateOrLastDateOfThisMonth(
        endDateValue,
        firstOfMonth
      );
      if (utils.date.isThisDateOrAfter(endDate, firstOfMonth)) {
        const values = row.validateValues([
          "householdId",
          "portion",
          "description",
          "unitId",
          "subsidyContractId",
          "petId",
          "notes",
        ]);

        const amount = row.valueNumber("amount");
        const proratedAmount = utils.date.prorateMonthlyAmount(
          amount,
          firstOfMonth,
          endDate
        );

        charge.addRowWithValues({
          ...values,
          amount: proratedAmount,
          chargeOngoingId: row.value("id"),
          date: firstOfMonth,
        });
      }
    });
  }
  buildOutPaymentsFirstOfMonth(date: Date = new Date()) {
    const firstOfMonth = utils.date.firstDayOfMonth(date);

    const ongoingCharge = this.ss.sheet("hhChargeOngoing");
    const payment = this.ss.sheet("hhPayment");
    const allocation = this.ss.sheet("hhPaymentAllocation");
    const paymentGroup = this.ss.sheet("paymentGroup");
    const subsidyContract = this.ss.sheet("subsidyContract");

    const actives = ongoingCharge.orderedRows.filter((row) => {
      const endDate = row.dateOrLastDayOfThisMonth("endDate", firstOfMonth);
      return utils.date.isThisDateOrAfter(endDate, firstOfMonth);
    });

    const groupedCharges = this.getPaymentGroups(actives);
    for (const gc of Obj.values(groupedCharges)) {
      const { paymentGroupId, subsidyContractId, householdId, portion } =
        gc[0].values([
          "subsidyContractId",
          "householdId",
          "paymentGroupId",
          "portion",
        ]);

      const paymentId = payment.addRowWithValues({
        date: firstOfMonth,
        detailsVerified: "No",
        ...(paymentGroupId && {
          paymentGroupId,
          ...paymentGroup
            .row(paymentGroupId)
            .values([
              "payerCategory",
              "householdId",
              "subsidyProgramId",
              "otherPayerId",
            ]),
        }),
        ...(!paymentGroupId && {
          payerCategory: portion,
          householdId,
          ...(subsidyContractId && {
            subsidyProgramId: subsidyContract
              .row(subsidyContractId)
              .value("subsidyProgramId"),
          }),
        }),
      });

      const p = payment.row(paymentId);
      let paymentTotal = 0;
      gc.forEach((row) => {
        const amount = row.valueNumber("amount");
        const endDate = row.dateOrLastDayOfThisMonth("endDate", firstOfMonth);
        const prorated = utils.date.prorateMonthlyAmount(
          amount,
          firstOfMonth,
          endDate
        );
        paymentTotal += prorated;

        allocation.addRowWithValues({
          amount: prorated,
          paymentId,
          description: "Normal payment",
          ...row.values([
            "portion",
            "householdId",
            "unitId",
            "subsidyContractId",
          ]),
        });
      });
      p.setValue("amount", paymentTotal);
    }
  }
  private buildOutAllCharges(): void {
    const ss = this.ss;
    const hhCharge = ss.sheet("hhCharge");
    hhCharge.DELETE_ALL_BODY_ROWS();

    this.buildFromChargesOngoing(({ date, proratedAmount, chargeOngoing }) => {
      hhCharge.addRowWithValues({
        date,
        amount: proratedAmount,
        chargeOngoingId: chargeOngoing.value("id"),
        ...chargeOngoing.values([
          "portion",
          "description",
          "householdId",
          "petId",
          "subsidyContractId",
          "unitId",
        ]),
      });
    });
    hhCharge.sortWithoutAddingChanges("subsidyContractId");
    hhCharge.sortWithoutAddingChanges("date");
    hhCharge.sort("hhMembersFullName");
    ss.batchUpdateRanges();
  }
  private buildOutAllPayments() {
    const ss = this.ss;
    const hhChargeOngoing = ss.sheet("hhChargeOngoing");
    const chargesOngoing = hhChargeOngoing.orderedRows;

    const hhPayment = ss.sheet("hhPayment");
    const hhPaymentAllocation = ss.sheet("hhPaymentAllocation");
    const subsidyContract = ss.sheet("subsidyContract");

    this.buildFromChargesOngoing(({ date, proratedAmount, chargeOngoing }) => {
      const subsidyContractId = chargeOngoing.value("subsidyContractId");
      const paymentId = hhPayment.addRowWithValues({
        amount: proratedAmount,
        date,
        detailsVerified: "No",
        ...(subsidyContractId
          ? {
              payer: "Subsidy program",
              subsidyProgramId: subsidyContract
                .row(subsidyContractId)
                .value("subsidyProgramId"),
            }
          : {
              payer: "Household",
            }),
        ...chargeOngoing.values(["householdId", "subsidyContractId"]),
      });

      hhPaymentAllocation.addRowWithValues({
        paymentId,
        ...chargeOngoing.values(["householdId", "unitId", "subsidyContractId"]),
        portion: chargeOngoing.value("portion"),
        description: "Normal payment",
        amount: proratedAmount,
      });
    }, chargesOngoing);
    hhPayment.sortWithoutAddingChanges("subsidyProgramId");
    hhPayment.sortWithoutAddingChanges("date");
    hhPayment.sort("hhName");
    ss.batchUpdateRanges();
  }
  private getPaymentGroups(
    ongoingCharges: Row<"hhChargeOngoing">[]
  ): Record<string, Row<"hhChargeOngoing">[]> {
    return ongoingCharges.reduce((acc, row) => {
      const { id, paymentGroupId } = row.values(["id", "paymentGroupId"]);

      if (paymentGroupId) {
        if (!acc[paymentGroupId]) {
          acc[paymentGroupId] = [];
        }
        acc[paymentGroupId].push(row);
      } else {
        if (!acc[id]) {
          acc[id] = [];
        }
        acc[id].push(row);
      }
      return acc;
    }, {} as Record<string, Row<"hhChargeOngoing">[]>);
  }
  isNotEndedFromThisDate(
    endDate: Value<"date">,
    thisDate: Date = new Date()
  ): boolean {
    return !endDate || utils.date.isDateAndThisDateOrAfter(endDate, thisDate);
  }

  test() {
    const date = new Date();
    const datePlusOne = new Date(date.getDate() + 1);
    const dateMinusOne = new Date(date.getDate() - 1);

    const datePlus30 = new Date(date.getDate() + 30);
    const datePlus31 = new Date(date.getDate() + 31);
    const datePlus29 = new Date(date.getDate() + 29);
  }
}
