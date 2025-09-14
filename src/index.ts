import { trigger } from "./addOnetimeCharge.ts";
import { spreadsheets } from "./Constants.ts";
import { asU } from "./utilitiesAppsScript.ts";

function main() {
  asU.batchUpdateRanges([], spreadsheets.realEstateManager.id);
  trigger({ range: asU.range.getNamed("apiAddOnetimeChargeEnter") });
}
