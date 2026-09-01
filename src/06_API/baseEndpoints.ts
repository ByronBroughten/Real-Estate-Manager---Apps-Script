import type { ColumnFullNameSimple } from "../01_generatedConfigs/columnConfigsTypes";
import { makeStructuredConfig } from "../01_generatedConfigs/makeConfigs";
import { FillRowIdsEndpoint } from "./FillRowIdsEndpoint";
import { SyncConfigSheetRowsEndpoint } from "./SyncConfigSheetRowsEndpoint";

export type Endpoints = Partial<Record<ColumnFullNameSimple, () => void>>;

export const baseEndpoints = makeStructuredConfig(
  {} as Endpoints,
  {
    spreadsheetControls_syncConfigSheetRowsTimeLastRan: () => {
      SyncConfigSheetRowsEndpoint.init().execute();
    },
    spreadsheetControls_fillRowIdsTimeLastRan: () => {
      FillRowIdsEndpoint.init().execute();
    },
  } as const,
);
