import { Spreadsheet } from "./addOnetimeCharge.js";
import { sectionNames } from "./appSchema/1. names/sectionNames.js";
import { asU } from "./utilitiesAppsScript.js";

function main() {
  asU.test();
  const ss = new Spreadsheet(sectionNames);
  console.log("All tests passed");
}
main();
