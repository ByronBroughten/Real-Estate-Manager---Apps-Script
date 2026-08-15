import { SpreadsheetRawBase } from "./01_SpreadsheetRaw/ClassBases/SpreadsheetRawBase.js";
import { SheetConfigRaw } from "./01_SpreadsheetRaw/SheetConfigRaw.js";
import { Api } from "./05_Api/Api.js";
import { businessEndpoints } from "./BusinessEndpoints/businessEndpoints.js";

function generateSheetTraitsFile(): string {
  const sheetConfig = new SheetConfigRaw({
    rawState: SpreadsheetRawBase.initRawState(),
  });
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
