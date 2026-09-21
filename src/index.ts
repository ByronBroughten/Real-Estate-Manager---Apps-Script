import { AppsScript } from "./00_Source/GoogleSheets/AppsScript.js";
import { GoogleSheetsAPI } from "./00_Source/GoogleSheets/GoogleSheetsAPI.js";
import {
  hasInstalledRawSource,
  installRawSource,
} from "./00_Source/RawSource/RawSource.js";
import { ConfigSheetFloor } from "./05_Operators/ConfigSheetFloor.js";
import { Api } from "./06_API/Api.js";
import { businessEndpoints } from "./businessEndpoints.js";

// Also the named level, perhaps check that table start rows are where you expect them all to be.
// sheet.validateSchemaIndexes()

function installGoogleSheets(): void {
  if (!hasInstalledRawSource())
    installRawSource(GoogleSheetsAPI.forAppsScript());
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Apps Script calls it as a global trigger
function triggerOnEdit(e: GoogleAppsScript.Events.SheetsOnEdit) {
  if (Api.isSuspectedApiCall(e)) {
    Api.init(businessEndpoints).handleSheetOnEditEvent(e);
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Apps Script calls it as a global trigger
function triggerOnChange(e: GoogleAppsScript.Events.SheetsOnChange) {
  const change = AppsScript.sheetChange(e.changeType);
  if (change === null) return;
  installGoogleSheets();
  const message = ConfigSheetFloor.init().changeToast(change);
  if (message !== null) AppsScript.toast(message);
}
