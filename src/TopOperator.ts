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

function proratedPortion<
  SN extends "hhLeaseChargeOngoing" | "scChargeOngoing",
  VN extends VarbName<SN>
>(row: Row<SN>, varbName: VN, dates: Dates) {
  const startDate = row.dateValueAfterOrGivenDate(
    "startDate",
    dates.firstOfMonth
  );
  const endDate = row.dateValueBeforeOrGivenDate("endDate", dates.lastOfMonth);
  return utils.date.prorateMonthlyAmount(
    row.valueNumber(varbName),
    startDate,
    endDate
  );
}

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
      sheet: Sheet<SN>
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
  handleCaretakerRentReduction(
    amount: number,
    date: Date = new Date(),
    householdId: string,
    unitId
  ) {
    if (amount === 0) {
      return;
    }

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
    const cfp: ChargeIdsForPayments = {
      paymentGroup: {},
      subsidyContract: {},
      household: {},
    };

    const { firstOfMonth, lastOfMonth } =
      utils.date.firstAndLastDayOfMonth(date);

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

        for (const lease of hhLeasesActiveThisMonth) {
          householdPortion += proratedPortion(lease, varbName, {
            firstOfMonth,
            lastOfMonth,
          });
        }

        if (varbName === "caretakerRentReduction") {
          this.handleCaretakerRentReduction(
            householdPortion,
            firstOfMonth,
            householdId,
            firstUnitId
          );
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
                  chargeId
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
            ])
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
