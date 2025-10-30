import {
  isApiSectionName,
  type SectionName,
} from "./appSchema/1. attributes/sectionAttributes";
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
  isEnterValue(sheetId: number, colIdx: number, rowIdx: number) {
    const { sectionName } = this.sectionsSchema.sectionBySheetId(sheetId);
    if (isApiSectionName(sectionName)) {
      const sheet = this.ss.sheet(sectionName);
      const triggerColIdx = sheet.colIdxBase1("enter");
      const triggerRowIdx = sheet.topBodyRowIdxBase1;
      const triggered = colIdx === triggerColIdx && rowIdx === triggerRowIdx;
      return triggered;
    } else return false;
  }
  buildHhLedger(): void {
    const ss = this.ss;
    const hhLedger = ss.sheet("hhLedger");
    hhLedger.DELETE_ALL_BODY_ROWS();

    const { householdId, portion, subsidyContractId } = ss
      .sheet("buildHhLedger")
      .topBodyRow.values();

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

    const filteredCharges = filteredRows(ss.sheet("hhCharge"));
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

    const filteredAllocations = filteredRows(ss.sheet("hhPaymentAllocation"));
    for (const row of filteredAllocations) {
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
  buildOutCharges(): void {
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
  buildOutPayments() {
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
    hhPayment.sort("hhMembersFullName");
    ss.batchUpdateRanges();
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
  addHhPaymentOnetime() {
    const ss = this.ss;
    const sAddOnetime = ss.sheet("addHhPaymentOnetime");
    const rAddOnetime = sAddOnetime.topBodyRow;

    const allValues = rAddOnetime.validateValues();
    const payerValues = Obj.strictPick(allValues, [
      "date",
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
    const sPayment = ss.sheet("hhPayment");
    sPayment.addRowWithValues(payerValues);

    const allocateValues = Obj.strictPick(allValues, [
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

    const sAllocation = ss.sheet("hhPaymentAllocation");
    sAllocation.addRowWithValues({
      paymentId: sPayment.topBodyRow.value("id"),
      ...allocateValues,
    });

    rAddOnetime.resetToDefault();
    rAddOnetime.setValue("date", "=TODAY()");
    ss.batchUpdateRanges();
  }
  addHhChargeOnetime() {
    const ss = this.ss;
    const sAddOnetime = ss.sheet("addHhChargeOnetime");
    const rAddOnetime = sAddOnetime.topBodyRow;
    const values = rAddOnetime.validateValues(
      Arr.excludeStrict(rAddOnetime.varbNames, ["id", "enter", "householdName"])
    );

    const sOnetime = ss.sheet("hhCharge");
    sOnetime.addRowWithValues(values);
    rAddOnetime.resetToDefault();
    rAddOnetime.setValue("date", "=TODAY()");
    ss.batchUpdateRanges();
  }
  monthlyRentUpdate() {
    this.recurringPriceUpdate("household", {
      dateCurrent: "rentIncreaseDateLast",
      dateNext: "rentIncreaseDateNext",
      priceCurrent: "rentChargeMonthly",
      priceNext: "rentChargeMonthlyNext",
    });
    this.oneTimePriceUpdate("subsidyContract", {
      dateNext: "rentPortionDateNext",
      priceCurrent: "rentPortionMonthly",
      priceNext: "rentPortionMonthlyNext",
    });
    this.ss.batchUpdateRanges();
  }

  private recurringPriceUpdate<SN extends SectionName>(
    sectionName: SN,
    names: {
      priceCurrent: VarbName<SN>;
      priceNext: VarbName<SN>;
      dateCurrent: VarbName<SN>;
      dateNext: VarbName<SN>;
    }
  ) {
    const ss = this.ss;
    const sheet = ss.sheet(sectionName);
    for (const row of sheet.orderedRows) {
      const dateNext = row.value(names.dateNext);
      if (dateNext instanceof Date && utils.date.isTodayOrPassed(dateNext)) {
        row.setValueType(
          names.priceCurrent,
          "number",
          row.value(names.priceNext)
        );
        row.setValueType(names.dateCurrent, "date", dateNext);
      }
    }
  }
  private oneTimePriceUpdate<SN extends SectionName>(
    sectionName: SN,
    names: {
      priceCurrent: VarbName<SN>;
      priceNext: VarbName<SN>;
      dateNext: VarbName<SN>;
    }
  ) {
    const ss = this.ss;
    const sheet = ss.sheet(sectionName);
    for (const row of sheet.orderedRows) {
      const dateNext = row.value(names.dateNext);
      if (dateNext instanceof Date && utils.date.isTodayOrPassed(dateNext)) {
        row.setValueType(
          names.priceCurrent,
          "number",
          row.value(names.priceNext)
        );
        row.setValueType(names.priceNext, "number", "");
        row.setValueType(names.dateNext, "date", "");
      }
    }
  }
  test() {
    const date = new Date();
    const datePlusOne = new Date(date.getDate() + 1);
    const dateMinusOne = new Date(date.getDate() - 1);

    const datePlus30 = new Date(date.getDate() + 30);
    const datePlus31 = new Date(date.getDate() + 31);
    const datePlus29 = new Date(date.getDate() + 29);

    const tests = {
      // recurringPriceUpdate: {
      //   before: {
      //     dateCurrent: [date, datePlusOne, dateMinusOne],
      //     dateNext: [datePlus30, datePlus31, datePlus29],
      //     priceCurrent: [1500, 1500, 1500],
      //     priceNext: [2000, 2000, 2000],
      //   },
      //   after: {
      //     dateCurrent: [],
      //     dateNext: [],
      //     priceCurrent: [2000, 1500, 2000],
      //     priceNext: [2000, 2000, 2000],
      //   },
      //   run: () => {
      //     this.recurringPriceUpdate("test", {
      //       dateCurrent: "dateCurrent",
      //       dateNext: "dateNext",
      //       priceCurrent: "priceCurrent",
      //       priceNext: "priceNext",
      //     });
      //     this.ss.batchUpdateRanges();
      //   },
      // },
      oneTimePriceUpdate: {
        beforeFn: () => {
          const allValues = {
            dateNext: [date, datePlusOne, dateMinusOne],
            priceCurrent: [1500, 1500, 1500],
            priceNext: [2000, 2000, 2000],
          } as const;
          const test = this.ss.sheet("test");
          for (let i = 0; i < 3; i++) {
            const values = Obj.keys(allValues).reduce((vals, varbName) => {
              vals[varbName as any] = allValues[varbName][i];
              return vals;
            }, {} as SectionValues<"test">);
            test.addRowWithValues(values);
          }
          this.ss.batchUpdateRanges();
        },
        afterFn: () => {
          const allValues = {
            dateNext: ["", "", ""],
            priceCurrent: [2000, 1500, 2000],
            priceNext: ["", 2000, ""],
          };
          const test = this.ss.sheet("test");
          for (let i = 0; i < 3; i++) {
            const values = Obj.keys(allValues).reduce((acc, key) => {
              acc[key] = allValues[key][i];
              return acc;
            });
            // check values
          }
        },
        run: () => {
          this.oneTimePriceUpdate("test", {
            dateNext: "dateNext",
            priceCurrent: "priceCurrent",
            priceNext: "priceNext",
          });
          this.ss.batchUpdateRanges();
        },
      },
    };

    for (const test of Obj.values(tests)) {
      const gTest = this.ss.gSheetBySectionName("test");
      gTest.deleteRows(this.ss.topBodyRowIdxBase1, 3);
      test.beforeFn();
      test.run();
      // check test.after
    }
  }
}
