import { SheetConfigRaw } from "./01_SpreadsheetRaw/SheetConfigRaw.js";
import { SpreadsheetNamed } from "./04_SpreadsheetNamed/SpreadsheetNamed.js";
import { Api } from "./05_Api/Api.js";
import { businessEndpoints } from "./businessEndpoints/businessEndpoints.js";

const testSheetId = 2089200354;
const testSheetName = "test";

//Named
// Ensure that for non-empty data row columns, columnIds are fetched;
// Ok, so when gathering a column at the named level, add fetching of columnIds for non-empty data row columns

//Raw
// Ensure that for columnIds and uniformRows, properties are fetched
// the columnId thing is only needed above the raw level;
// No, I keep this at the named level, but I make a version that builds on it at the raw level in one way (ensuring sheet properties, ensuring headers)
// - Map<sheegGid, properties get request>, Map<sheetGid, headers get request>, Map<sheetGid, data get request

function testFillMissingrowIds() {
  const ss = SpreadsheetNamed.init();
  const idColumn = ss.sheet(testSheetName).column("id");
  idColumn.prepFetchAllDataCells(); //

  ss.fetchAllPrepped();
  idColumn.fillEmptyDataCellsWithDefaultValues();
  ss.batchUpdateGSheets();
}

function generateSheetTraitsFile(): string {
  const sheetConfig = new SheetConfigRaw(
    SheetConfigRaw.initSpreadsheetRawProps(),
  );
  return sheetConfig.generateSheetTraitsFileSource();
}

function triggerFirstOfMonth() {
  // Placeholder
}

function triggerOnEdit(e: GoogleAppsScript.Events.SheetsOnEdit) {
  if (Api.isSuspectedApiCall(e)) {
    Api.init(businessEndpoints).handleSheetOnEditEvent(e);
  }
}
