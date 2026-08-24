import { SheetConfigOperator } from "./04_SpreadsheetNamed/SheetConfigOperator.js";
import { SpreadsheetNamed } from "./04_SpreadsheetNamed/SpreadsheetNamed.js";
import { Api } from "./06_API/Api.js";
import { businessEndpoints } from "./businessEndpoints.js";

const testSheetId = 2089200354;
const testSheetName = "test";

// activeDataColIndexes

// implement the PreGridRange and store them in sheetStates
// If a sheet state has non-empty PreGridRanges, fetch its properties and columnIds.
// assume the base configs will exist in the configs; use Named for most things.
// for now you can create a file where the pre-implemented base configs exist

// No more activeColumns, just activeDataColumns; ensure activeDataColumn uniformity. You shouldn't ever need other uniform row values except for one-offs or entire rows. Like, you won't need just the header of active data columns.

// Otherwise:
// On the named level, after the fetch, check that the columnIds match the expected columnIds. If not, throw an error. Loop through sheet columns.

// Also the named level, perhaps check that table start rows are where you expect them all to be.
// sheet.validateSchemaIndexes()

//Raw
// I kind of need properties still for filling missing columnIds.
// Ensure that for columnIds and uniformRows, properties are fetched
// the columnId thing is only needed above the raw level;
// No, I keep this at the named level, but I make a version that builds on it at the raw level in one way (ensuring sheet properties, ensuring headers)
// - Map<sheegGid, properties get request>, Map<sheetGid, headers get request>, Map<sheetGid, data get request

function _tests() {
  const ss = SpreadsheetNamed.init();
  // const idColumn = ss.sheet(testSheetName).column("id");
  // idColumn.gatherFetchAllDataCells();
  // ss.fetchAllPrepped();
  // idColumn.emptyDataCellsToDefault();
  const test = ss.sheet(testSheetName);
  test.raw.gatherFetchProperties();
  test.raw.uniformRow("columnId").gatherFetchFull();
  ss.fetchAllPrepped();
  ss.sheet(testSheetName).addMissingColumnIds();
  ss.batchUpdateGSheets();
}

function generateSheetConfigFile(): string {
  const sheetConfigNamed = new SheetConfigOperator(
    SheetConfigOperator.initSpreadsheetNamedProps(),
  );
  return sheetConfigNamed.generateSheetConfigFileSource();
}

function triggerFirstOfMonth() {
  // Placeholder
}

function triggerOnEdit(e: GoogleAppsScript.Events.SheetsOnEdit) {
  if (Api.isSuspectedApiCall(e)) {
    Api.init(businessEndpoints).handleSheetOnEditEvent(e);
  }
}
