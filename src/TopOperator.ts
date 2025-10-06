import type { SectionName } from "./appSchema/1. names/sectionNames";
import type { VarbName } from "./appSchema/2. attributes/sectionVarbAttributes";
import {
  SpreadsheetBase,
  type SpreadsheetProps,
} from "./StateHandlers/HandlerBases/SpreadsheetBase";
import { Spreadsheet } from "./StateHandlers/Spreadsheet";
import { utils } from "./utilitiesGeneral";
import { Obj } from "./utils/Obj";

interface TopOperatorProps extends SpreadsheetProps {
  ss: Spreadsheet;
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

  addHhOnetimeCharge() {
    const ss = this.ss;
    const sAddOnetime = ss.sheet("addHhChargeOnetime");
    const rAddOnetime = sAddOnetime.topBodyRow;
    const values = rAddOnetime.validateValues();
    const sOnetime = ss.sheet("hhChargeOnetime");
    sOnetime.addRowWithValues(values);
    ss.batchUpdateRanges();
  }
  monthlyRentUpdate() {
    this.recurringPriceUpdate("household", {
      dateCurrent: "rentIncreaseDateLast",
      dateNext: "rentIncreaseDateNext",
      priceCurrent: "rentChargeMonthly",
      priceNext: "rentChargeMonthlyNext",
    });
    this.oneTimePriceUpdate("household", {
      dateNext: "subsidyPortionChangeDate",
      priceCurrent: "subsidyPortionMonthly",
      priceNext: "subsidyPortionMonthlyNext",
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
    const test = ss.sheet(sectionName);
    for (const row of test.orderedRows) {
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
    const test = ss.sheet(sectionName);
    for (const row of test.orderedRows) {
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
    // I gotta define what the sheet state looks like before
    // and after each test

    // update the ranges before
    const tests = {
      recurringPriceUpdate: {
        before: {
          // probably like ten values each, yeah?
          dateCurrent: [],
          dateNext: [],
          priceCurrent: [],
          priceNext: [],
        },
        after: {
          dateCurrent: [],
          dateNext: [],
          priceCurrent: [],
          priceNext: [],
        },
        run: () => {
          this.recurringPriceUpdate("test", {
            dateCurrent: "dateCurrent",
            dateNext: "dateNext",
            priceCurrent: "priceCurrent",
            priceNext: "priceNext",
          });
          this.ss.batchUpdateRanges();
        },
      },
      oneTimePriceUpdate: {
        before: {
          dateNext: [],
          priceCurrent: [],
          priceNext: [],
        },
        after: {
          dateNext: [],
          priceCurrent: [],
          priceNext: [],
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
      // set test.before
      test.run();
      // check test.after
      // reset test body rows to blank
    }
  }
}
