import { SpreadsheetNamed } from "./04_SpreadsheetNamed/SpreadsheetNamed.js";
import { ConfigOrchestrator } from "./05_Operators/ConfigOrchestrator.js";
import { Api } from "./06_API/Api.js";
import { businessEndpoints } from "./businessEndpoints.js";

// Also the named level, perhaps check that table start rows are where you expect them all to be.
// sheet.validateSchemaIndexes()

function _indexMainTest() {
  const testSheetId = 2089200354;
  const testSheetName = "test";
  type TestName = keyof typeof mainTests;
  const nameOfTestToRun: TestName = "addColumnIds";
  const ss = SpreadsheetNamed.init();
  const mainTests = {
    syncConfigSheets() {
      ConfigOrchestrator.init().syncAndFlushConfigSheets();
    },
    addColumnIds() {
      const test = ss.sheet("test");
      test.uniformRow("columnId").prepFetchFull();
      ss.fetchAllPrepped();
      ss.sheet("test").addMissingColumnIds();
      ss.batchUpdateGSheets();
    },
    addRowIds() {
      const idColumn = ss.sheet("test").column("id").data;
      idColumn.prepFetchFull();
      ss.fetchAllPrepped({});
      idColumn.emptyDataCellsToDefault();
      ss.batchUpdateGSheets();
    },
  } as const;
  mainTests[nameOfTestToRun]();
}

function syncAndFlushConfigSheets() {
  ConfigOrchestrator.init().syncAndFlushConfigSheets();
}

function generateConfigFiles() {
  // needed for npm run gen:configs
  return ConfigOrchestrator.init().generateConfigFiles();
}

function triggerOnEdit(e: GoogleAppsScript.Events.SheetsOnEdit) {
  if (Api.isSuspectedApiCall(e)) {
    Api.init({
      ...businessEndpoints,
    }).handleSheetOnEditEvent(e);
  }
}
