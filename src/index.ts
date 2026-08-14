import { SpreadsheetRawBase } from "./02_AppsScriptRaw/ClassBases/SpreadsheetRawBase.js";
import { SheetConfigRaw } from "./02_AppsScriptRaw/SpecificSheetRaw/SheetConfigRaw.js";
import { Api } from "./Api.js";

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
    Api.init().handleSheetOnEditEvent(e);
  }
}
