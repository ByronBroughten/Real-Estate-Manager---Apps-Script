import { RangeObj } from "./addOnetimeCharge.js";
import { sectionVarbs } from "./appSchema/2. attributes/sectionVarbAttributes.js";
import { asU } from "./utilitiesAppsScript.js";

function main() {
  const schema = sectionVarbs;
  asU.test();
  RangeObj.test();
  console.log("All tests passed");
}
main();

// Test ideas:
// Make sure the variables aren't missing from any section
