import { columnConfigs } from "../01_SpreadsheetSchema/generated/columnConfigs";
import type { ColumnName } from "../01_SpreadsheetSchema/columnConfigsTypes";
import { ConfigSheetFloor } from "../05_Operators/ConfigSheetFloor";
import { baseEndpoints } from "../06_API/baseEndpoints";
import type { Chore } from "./Chore";

export const ensureConfigSheetFloor: Chore = {
  description:
    "Puts an edit warning on every config-sheet floor cell, and replaces drifted floor warnings.",
  action: (ss) => {
    const report = new ConfigSheetFloor(ss.spreadsheetNamedProps).ensure(
      baseEndpointFeedbackColumnNames(),
    );
    ss.batchUpdateGSheets();
    return report;
  },
};

function baseEndpointFeedbackColumnNames(): ColumnName<"spreadsheetConfig">[] {
  const names: ColumnName<"spreadsheetConfig">[] = [];
  Object.values(baseEndpoints).forEach((endpoint) => {
    const timeLastRan = endpoint?.timeLastRan;
    if (isSpreadsheetConfigColumn(timeLastRan)) names.push(timeLastRan);
    const runStatus = endpoint?.runStatus;
    if (isSpreadsheetConfigColumn(runStatus)) names.push(runStatus);
  });
  return names;
}

function isSpreadsheetConfigColumn(
  columnName: string | undefined,
): columnName is ColumnName<"spreadsheetConfig"> {
  if (columnName === undefined) return false;
  return Object.prototype.hasOwnProperty.call(
    columnConfigs.spreadsheetConfig,
    columnName,
  );
}
