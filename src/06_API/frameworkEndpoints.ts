import { ConfigOrchestrator } from "../05_Operators/ConfigOrchestrator";
import type { Endpoints } from "./Endpoints";

export const frameworkEndpoints: Endpoints = {
  spreadsheetConfig_syncConfigSheetRowsTimeLastRan: {
    action: (ss) =>
      new ConfigOrchestrator(ss.spreadsheetNamedProps).syncConfigSheetRows(),
    timeLastRan: "syncConfigSheetRowsTimeLastRan",
    runStatus: "syncConfigSheetRowsRunStatus",
  },
  spreadsheetConfig_fillRowIdsTimeLastRan: {
    action: (ss) => {
      ss.fillMissingRowIds();
    },
    timeLastRan: "fillRowIdsTimeLastRan",
    runStatus: "fillRowIdsRunStatus",
  },
};
