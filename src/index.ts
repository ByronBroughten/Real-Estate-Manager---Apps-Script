import { SheetConfigRaw } from "./01_SpreadsheetRaw/SheetConfigRaw.js";
import { SpreadsheetNamed } from "./04_SpreadsheetNamed/SpreadsheetNamed.js";
import { Api } from "./05_Api/Api.js";
import { businessEndpoints } from "./businessEndpoints/businessEndpoints.js";

const testSheetId = 2089200354;
const testSheetName = "test";

function testFillMissingrowIds() {
  const ss = SpreadsheetNamed.init();
  const idColumn = ss.sheet(testSheetName).column("id");
  idColumn.prepfetchAllPreppedDataCells();
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
