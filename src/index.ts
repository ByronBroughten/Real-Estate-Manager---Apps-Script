import type { AppSetup } from "./06_API/Api.js";
import { appConfigs } from "./appConfigs.js";
import { AppsScriptApi } from "./appsScriptHost/AppsScriptApi.js";
import { businessEndpoints } from "./businessEndpoints.js";

// Also the named level, perhaps check that table start rows are where you expect them all to be.
// sheet.validateSchemaIndexes()

const app: AppSetup = { configs: appConfigs, endpoints: businessEndpoints };

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Apps Script calls it as a global trigger
function triggerOnEdit(e: GoogleAppsScript.Events.SheetsOnEdit) {
  AppsScriptApi.handleSheetEdit(app, e);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Apps Script calls it as a global trigger
function triggerOnChange(e: GoogleAppsScript.Events.SheetsOnChange) {
  AppsScriptApi.handleSheetChange(app, e);
}
