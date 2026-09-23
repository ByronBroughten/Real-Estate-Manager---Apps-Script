import { AppsScript } from "./00_Source/GoogleSheets/AppsScript.js";
import { GoogleSheetsAPI } from "./00_Source/GoogleSheets/GoogleSheetsAPI.js";
import {
  hasInstalledRawSource,
  installRawSource,
} from "./00_Source/RawSource/RawSource.js";
import { Api, type AppSetup } from "./06_API/Api.js";
import { appConfigs } from "./appConfigs.js";
import { businessEndpoints } from "./businessEndpoints.js";

// Also the named level, perhaps check that table start rows are where you expect them all to be.
// sheet.validateSchemaIndexes()

const app: AppSetup = { configs: appConfigs, endpoints: businessEndpoints };

function installGoogleSheets(): void {
  if (!hasInstalledRawSource())
    installRawSource(GoogleSheetsAPI.forAppsScript());
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Apps Script calls it as a global trigger
function triggerOnEdit(e: GoogleAppsScript.Events.SheetsOnEdit) {
  Api.handleSheetEdit(app, AppsScript.sheetEdit(e), installGoogleSheets);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Apps Script calls it as a global trigger
function triggerOnChange(e: GoogleAppsScript.Events.SheetsOnChange) {
  const message = Api.handleSheetChange(
    app,
    AppsScript.sheetChange(e.changeType),
    installGoogleSheets,
  );
  if (message !== null) AppsScript.toast(message);
}
