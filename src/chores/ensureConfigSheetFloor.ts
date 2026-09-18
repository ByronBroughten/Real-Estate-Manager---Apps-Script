import { columnConfigs } from "../01_SpreadsheetSchema/generated/columnConfigs";
import type { ColumnName } from "../01_SpreadsheetSchema/columnConfigsTypes";
import { ConfigSheetFloor } from "../05_Operators/ConfigSheetFloor";
import { frameworkEndpoints } from "../06_API/frameworkEndpoints";
import type { Chore } from "./Chore";

export const ensureConfigSheetFloor: Chore = {
  description:
    "Puts an edit warning on every config-sheet floor cell, and replaces drifted floor warnings.",
  action: (ss) => {
    const report = new ConfigSheetFloor(ss.spreadsheetNamedProps).ensure(
      frameworkEndpointFeedbackColumnNames(),
    );
    ss.batchUpdateGSheets();
    return report;
  },
};

function frameworkEndpointFeedbackColumnNames(): ColumnName<"spreadsheetConfig">[] {
  const names: ColumnName<"spreadsheetConfig">[] = [];
  Object.values(frameworkEndpoints).forEach((endpoint) => {
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
