import { Api } from "./06_API/Api.js";
import { businessEndpoints } from "./businessEndpoints.js";

// Also the named level, perhaps check that table start rows are where you expect them all to be.
// sheet.validateSchemaIndexes()

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Apps Script calls it as a global trigger
function triggerOnEdit(e: GoogleAppsScript.Events.SheetsOnEdit) {
  if (Api.isSuspectedApiCall(e)) {
    Api.init(businessEndpoints).handleSheetOnEditEvent(e);
  }
}
