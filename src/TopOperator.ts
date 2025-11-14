import { type GroupSectionName } from "./appSchema/1. attributes/sectionAttributes";
import { chargeVarbToDescriptor } from "./appSchema/1. attributes/valueAttributes/pairs";
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
import { utils } from "./utilitiesGeneral";
import { Arr } from "./utils/Arr";
import { Obj } from "./utils/Obj";

interface TopOperatorProps extends SpreadsheetProps {
  ss: Spreadsheet;
}

type LedgerInputSn = "hhCharge" | "hhPaymentAllocation";
type ChargeIdsForPayments = {
  paymentGroups: {
    [paymentGroupId: string]: string[];
  };
  singles: string[];
};

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

  monthlyRentUpdate() {
    this.updateLeaseOngoingCharges();
    this.updateSubsidyOngoingCharges();
    this.ss.batchUpdateRanges();
    // needed for accurately building out charges

    const cfp = this.buildOutChargesFirstOfMonth();
    this.buildOutPaymentsFromCharges(cfp);
    this.ss.batchUpdateRanges();
  }
  // private buildFromChargesOngoing(
  //   doUpdate: (props: BuildFromChargeOngoingProps) => void,
  //   chargesOngoing: Row<"hhChargeOngoing">[] = this.ss.sheet("hhChargeOngoing")
  //     .orderedRows
  // ) {

  //   chargesOngoing.forEach((chargeOngoing) => {
  //     const startDate = chargeOngoing.valueDate("startDate");
  //     const endDateMaybe = chargeOngoing.value("endDate");
  //     const endDate = endDateMaybe
  //       ? valS.validate.date(endDateMaybe)
  //       : utils.date.lastDateOfMonth(new Date());

  //     const dates = utils.date.firstDaysOfMonths(startDate, endDate);

  //     for (let i = 0; i < dates.length; i++) {
  //       const date = dates[i];
  //       const end =
  //         i === dates.length - 1 ? endDate : utils.date.lastDateOfMonth(date);

  //       const proratedAmount = utils.date.prorateMonthlyAmount(
  //         chargeOngoing.valueNumber("amount"),
  //         date,
  //         end
  //       );

  //       doUpdate({
  //         date,
  //         proratedAmount,
  //         chargeOngoing,
  //       });
  //     }
  //   });
  // }
  updateLeaseOngoingCharges() {
    const household = this.ss.sheet("household");
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
          Arr.compareForSort(b.value("startDate"), a.value("startDate"))
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
  buildOutChargesFirstOfMonth(date: Date = new Date()) {
    const cfp: ChargeIdsForPayments = {
      paymentGroups: {},
      singles: [],
    };

    const firstOfMonth = utils.date.firstDayOfMonth(date);
    const lastOfMonth = utils.date.lastDateOfMonth(firstOfMonth);

    const household = this.ss.sheet("household");
    const scChargeOngoing = this.ss.sheet("scChargeOngoing");
    const hhLeaseOngoing = this.ss.sheet("hhLeaseChargeOngoing");
    const charge = this.ss.sheet("hhCharge");

    function getActives<SN extends "hhLeaseChargeOngoing" | "scChargeOngoing">(
      householdId: string,
      sheet: Sheet<SN>
    ): Row<SN>[] {
      return sheet.orderedRows.filter((row) => {
        const startDate = row.valueDate("startDate");
        const endDate = row.dateValueOrGivenDate("endDate", lastOfMonth);
        // The start date needs to be on or before the last day of the month
        // The end date needs to be on or after the first day of the month
        return (
          row.value("householdId") === householdId &&
          utils.date.isDateSameOrBefore(startDate, lastOfMonth) &&
          utils.date.isDateSameOrAfter(endDate, firstOfMonth)
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

        function proratedPortion<
          SN extends "hhLeaseChargeOngoing" | "scChargeOngoing",
          VN extends VarbName<SN>
        >(row: Row<SN>, varbName: VN) {
          const startDate = row.dateValueAfterOrGivenDate(
            "startDate",
            firstOfMonth
          );
          const endDate = row.dateValueBeforeOrGivenDate(
            "endDate",
            lastOfMonth
          );
          return utils.date.prorateMonthlyAmount(
            row.valueNumber(varbName),
            startDate,
            endDate
          );
        }

        for (const lease of hhLeasesActiveThisMonth) {
          householdPortion += proratedPortion(lease, varbName);
        }

        if (varbName === "rentChargeBaseMonthly") {
          let subsidyPortion = 0;
          for (const scContract of scChargesActiveThisMonth) {
            subsidyPortion += proratedPortion(scContract, "amount");
          }
          if (subsidyPortion) {
            householdPortion -= subsidyPortion;
            const subsidyChargeId = charge.addRowWithValues({
              portion: "Subsidy program",
              description: "Rent charge (base)",
              subsidyContractId: scChargesActiveThisMonth[0].value("id"),
              amount: subsidyPortion,
              ...chargeProps,
            });
            const paymentGroupId =
              scChargesActiveThisMonth[0].value("paymentGroupId");
            if (paymentGroupId) {
              if (!cfp.paymentGroups[paymentGroupId]) {
                cfp.paymentGroups[paymentGroupId] = [];
              }
              cfp.paymentGroups[paymentGroupId].push(subsidyChargeId);
            } else {
              cfp.singles.push(subsidyChargeId);
            }
          }
        }
        const householdChargeId = charge.addRowWithValues({
          amount: householdPortion,
          portion: "Household",
          description: chargeVarbToDescriptor[varbName],
          ...chargeProps,
        });
        cfp.singles.push(householdChargeId);
      }
    });
    return cfp;
  }
  buildOutPaymentsFromCharges(cfp: ChargeIdsForPayments) {
    this.addPaymentsAndAllocate({
      chargeIds: cfp.singles,
    });

    Obj.keys(cfp.paymentGroups).forEach((paymentGroupId) => {
      this.addPaymentsAndAllocate({
        paymentGroupId: paymentGroupId as string,
        chargeIds: cfp.paymentGroups[paymentGroupId],
      });
    });
  }
  addPaymentsAndAllocate({
    paymentGroupId,
    chargeIds,
  }: {
    paymentGroupId?: string;
    chargeIds: string[];
  }) {
    const hhCharge = this.ss.sheet("hhCharge");
    const payment = this.ss.sheet("hhPayment");
    const allocation = this.ss.sheet("hhPaymentAllocation");
    const paymentGroup = this.ss.sheet("paymentGroup");
    const subsidyContract = this.ss.sheet("subsidyContract");

    const charges = chargeIds.map((id) => hhCharge.row(id));
    const topCharge = charges[0];
    const subsidyContractId = topCharge.value("subsidyContractId");
    const paymentId = payment.addRowWithValues({
      date: topCharge.valueDate("date"),
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
        payerCategory: topCharge.value("portion"),
        householdId: topCharge.value("householdId"),
        ...(subsidyContractId && {
          subsidyProgramId: subsidyContract
            .row(subsidyContractId)
            .value("subsidyProgramId"),
        }),
      }),
    });
    const p = payment.row(paymentId);
    let paymentTotal = 0;
    charges.forEach((row) => {
      const amount = row.valueNumber("amount");
      paymentTotal += amount;
      allocation.addRowWithValues({
        amount,
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
