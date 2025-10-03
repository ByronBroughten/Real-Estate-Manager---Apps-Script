import { Spreadsheet } from "./StateHandlers/Spreadsheet";
import { utils } from "./utilitiesGeneral";

class TopOperator {
  constructor() {}
  // this one will be responsible for batch updating everything.
  // all the other operations will be divorced of that.
}

export function test() {
  recurringPriceUpdate();
}

function monthlyRentUpdate() {
  // I ought to make a class that has these and then has the spreadsheet
  // and then does the range data push at the end.
  recurringPriceUpdate();
  oneTimePriceUpdate();
}

function recurringPriceUpdate() {
  const rentRangeNames = {
    dateCurrent: "rentIncreaseDateLast",
    dateNext: "rentIncreaseDateNext",
    priceCurrent: "rentPaymentMonthly",
    priceNext: "rentPaymentMonthlyNext",
  };

  const testRentRangeNames = {
    dateCurrent: "testDate",
    dateNext: "testDateNext",
    priceCurrent: "testPaymentMonthly",
    priceNext: "testPaymentMonthlyNext",
  };

  const ss = Spreadsheet.init();
  const test = ss.sheet("test");
  for (const row of test.orderedRows) {
    const dateNext = row.value("dateNext");
    if (dateNext instanceof Date && utils.date.isTodayOrPassed(dateNext)) {
      row.setValue("priceCurrent", row.value("priceNext"));
      row.setValue("dateCurrent", dateNext);
    }
  }
  ss.batchUpdateRanges();
}

function oneTimePriceUpdate() {
  const phaRangeNames = {
    dateNext: "phaPaymentChangeDate",
    priceCurrent: "phaPaymentMonthly",
    priceNext: "phaPaymentNext",
  };

  const testPhaRangeNames = {
    dateNext: "testDateOfChange",
    priceCurrent: "testSubPaymentMonthly",
    priceNext: "testSubPaymentMonthlyNext",
  };

  const ss = Spreadsheet.init();
  const test = ss.sheet("test");
  for (const row of test.orderedRows) {
    const dateNext = row.value("dateNext");
    if (dateNext instanceof Date && utils.date.isTodayOrPassed(dateNext)) {
      row.setValue("priceCurrent", row.value("priceNext"));
      row.setValue("priceNext", "");
      row.setValue("dateNext", "");
    }
  }
  ss.batchUpdateRanges();
}

export const api = {
  monthlyRentUpdate() {},
  addHhOnetimeCharge() {
    const ss = Spreadsheet.init();

    const sAddOnetime = ss.sheet("addHhChargeOnetime");
    const rAddOnetime = sAddOnetime.topBodyRow;
    const values = rAddOnetime.validateValues();

    const sOnetime = ss.sheet("hhChargeOnetime");
    sOnetime.addRowWithValues(values);
    ss.batchUpdateRanges();
  },
  updateRentPortions() {
    const ss = Spreadsheet.init();
  },
};
