import { Spreadsheet } from "./Spreadsheet.js";
import { sectionNames } from "./appSchema/1. names/sectionNames.js";
import { asU } from "./utilitiesAppsScript.js";

function main() {
  asU.test();
  const ss = Spreadsheet.init(sectionNames);
  console.log("All tests passed");
}
main();
