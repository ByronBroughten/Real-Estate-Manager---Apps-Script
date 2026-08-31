import { FillRowIdsEndpoint } from "./FillRowIdsEndpoint";
import { SyncConfigSheetRowsEndpoint } from "./SyncConfigSheetRowsEndpoint";

export const baseEndpoints = {
  spreadsheetControls_syncConfigSheetRowsTimeLastRan: () => {
    SyncConfigSheetRowsEndpoint.init().syncSheetConfigRows();
  },
  spreadsheetControls_fillRowIds: () => {
    FillRowIdsEndpoint.init().fillMissingRowIds();
  },
} as const;
