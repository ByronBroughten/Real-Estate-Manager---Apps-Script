import { ConfigOrchestrator } from "../05_Operators/ConfigOrchestrator";
import type { Endpoints } from "./Endpoints";

export const baseEndpoints: Endpoints = {
  spreadsheetControls_syncConfigSheetRowsTimeLastRan: {
    action: (ss) => {
      new ConfigOrchestrator(ss.spreadsheetNamedProps).syncConfigSheetRows();
    },
    timeLastRan: "syncConfigSheetRowsTimeLastRan",
    runStatus: "syncConfigSheetRowsRunStatus",
  },
  spreadsheetControls_fillRowIdsTimeLastRan: {
    action: (ss) => {
      ss.fillMissingRowIds();
    },
    timeLastRan: "fillRowIdsTimeLastRan",
    runStatus: "fillRowIdsRunStatus",
  },
};
