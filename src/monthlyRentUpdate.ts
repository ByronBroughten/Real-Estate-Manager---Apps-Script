import { spreadsheets } from "./Constants.js";
import { Spreadsheet } from "./StateHandlers/Spreadsheet.js";
import { asU } from "./utilitiesAppsScript.js";
import type { RangeData } from "./utilitiesAppsScript.ts";
import { utils } from "./utilitiesGeneral.js";

function testMonthlyRentUpdate() {
  const rangeData: RangeData[] = [];
  rangeData.push(...getRecurringPriceUpdateRangeData(testRentRangeNames));
  rangeData.push(...getOneTimePriceUpdateRangeData(testPhaRangeNames));
  return asU.batchUpdateRanges(rangeData, spreadsheets.realEstateManager.id);
}

function setMonthlyRentUpdateTrigger() {
  asU.trigger.addFirstOfMonth("monthlyRentUpdate");
}

function monthlyRentUpdate() {
  const rangeData: RangeData[] = [];
  rangeData.push(...getRecurringPriceUpdateRangeData(rentRangeNames));
  rangeData.push(...getOneTimePriceUpdateRangeData(phaRangeNames));
  return asU.batchUpdateRanges(rangeData, spreadsheets.realEstateManager.id);
}

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

function testGetRecurringPriceUpdateRangeData() {
  const rangeData = getRecurringPriceUpdateRangeData(testRentRangeNames);
  return asU.batchUpdateRanges(rangeData, spreadsheets.realEstateManager.id);
}

function getRecurringPriceUpdateRangeDataNext() {
  const ss = Spreadsheet.init();
}

function getRecurringPriceUpdateRangeData(genToRangeNames: {
  [key: string]: string;
}): RangeData[] {
  const gro = asU.range.makeGenericRangeObj(genToRangeNames);
  for (const [index, [dateNext]] of gro.dateNext.vls.entries()) {
    const dateCurrent = gro.dateCurrent.vls[index][0];
    if (dateNext instanceof Date && utils.date.isTodayOrPassed(dateNext)) {
      gro.priceCurrent.vls[index] = gro.priceNext.vls[index];
      gro.dateCurrent.vls[index] = [asU.standardize.date(dateNext)];
    } else if (dateCurrent instanceof Date) {
      gro.dateCurrent.vls[index] = [asU.standardize.date(dateCurrent)];
    }
  }
  return asU.range.makeRangeData(gro, ["priceCurrent", "dateCurrent"]);
}

const phaRangeNames = {
  dateOfChange: "phaPaymentChangeDate",
  priceCurrent: "phaPaymentMonthly",
  priceNext: "phaPaymentNext",
};

const testPhaRangeNames = {
  dateOfChange: "testDateOfChange",
  priceCurrent: "testSubPaymentMonthly",
  priceNext: "testSubPaymentMonthlyNext",
};

function testGetOneTimePriceUpdateRangeData(): void {
  const rangeData = getOneTimePriceUpdateRangeData(testPhaRangeNames);
  return asU.batchUpdateRanges(rangeData, spreadsheets.realEstateManager.id);
}

function getOneTimePriceUpdateRangeData(genToRangeNames: {
  [key: string]: string;
}): RangeData[] {
  const gro = asU.range.makeGenericRangeObj(genToRangeNames);
  for (const [index, [date]] of gro.dateOfChange.vls.entries()) {
    if (date instanceof Date) {
      if (utils.date.isTodayOrPassed(date)) {
        gro.priceCurrent.vls[index] = gro.priceNext.vls[index];
        gro.priceNext[index].vls = [""];
        gro.dateOfChange[index].vls = [""];
      } else {
        gro.dateOfChange[index].vls = [asU.standardize.date(date)];
      }
    }
  }
  return asU.range.makeRangeData(gro);
}
