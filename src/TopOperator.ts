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
  isEnterValue(sheetId: number, colIdx: number, rowIdx: number) {
    const { sectionName } = this.sectionsSchema.sectionBySheetId(sheetId);
    if (isApiSectionName(sectionName)) {
      const sheet = this.ss.sheet(sectionName);
      const triggerColIdx = sheet.colIdxBase1("enter");
      const triggerRowIdx = sheet.topBodyRowIdxBase1;
      return colIdx === triggerColIdx && rowIdx === triggerRowIdx;
    } else return false;
  }
  buildOutCharges() {
    const ss = this.ss;
    const hhCharge = ss.sheet("hhCharge");

    this.buildFromChargesOngoing(({ date, proratedAmount, chargeOngoing }) => {
      hhCharge.addRowWithValues({
        date,
        amount: proratedAmount,
        chargeSourceId: chargeOngoing.value("id"),
        ...chargeOngoing.values([
          "description",
          "householdId",
          "petId",
          "subsidyContractId",
          "unitId",
        ]),
      });
    });
    ss.batchUpdateRanges();
    // Sort by description > date > household name
  }

  buildOutPaymentGroups() {
    // For payment groups, I basically just need to create something that functions as hhChargeOngoing
    // Basically, just adding together all of the payment amounts in the group on a per-month basis.
    // It gets complicated depending on whether something is at the beginning or end of the month.
    // Like, if the subsidy contract starts on the 20th... that amount would be added to the next
    // payment group.
    // But if it starts on the 1st, it can perhaps stay in the payment group.
    // This is getting complicated.
    // Once these are defined effectively, though, I can pretty much just use the buildOutPayments logic.
  }
  buildOutPayments() {
    const ss = this.ss;
    const hhChargeOngoing = ss.sheet("hhChargeOngoing");
    const noPaymentGroups = hhChargeOngoing.orderedRows.filter((row) => {
      return row.value("paymentGroupId") === "";
    });

    const hhPayment = ss.sheet("hhPayment");
    const hhPaymentAllocation = ss.sheet("hhPaymentAllocation");
    const subsidyContract = ss.sheet("subsidyContract");

    this.buildFromChargesOngoing(({ proratedAmount, chargeOngoing }) => {
      const subsidyContractId = chargeOngoing.value("subsidyContractId");
      const paymentId = hhPayment.addRowWithValues({
        amount: proratedAmount,
        date: "",
        ...(subsidyContractId
          ? {
              paidBy: "Subsidy program",
              subsidyProgramId: subsidyContract
                .row(subsidyContractId)
                .value("subsidyProgramId"),
            }
          : {
              paidBy: "Household",
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
    }, noPaymentGroups);
    ss.batchUpdateRanges();
    // For the ones that are in payment groups, I need to do a more complex thing.
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

  addRecurringTransaction() {
    // implement this for updating rent amounts
  }
  addHhOnetimeCharge() {
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
