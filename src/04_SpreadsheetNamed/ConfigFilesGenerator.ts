import { ColumnConfigOperator } from "./ColumnConfigOperator";
import { SheetConfigOperator } from "./SheetConfigOperator";

// Syncs the live Sheet Config sheet, then (now that it's current) the live
// Column Config sheet, sharing one ColumnConfigOperator's state so both
// sets of queued changes — plus any column IDs written to business sheets
// along the way — persist in a single flush. See CLAUDE.md/README for why
// these two must be synced and regenerated together.
export function syncAndFlushConfigSheets(): {
  sheetConfigOperator: SheetConfigOperator;
  columnConfigOperator: ColumnConfigOperator;
} {
  const columnConfigOperator = ColumnConfigOperator.init();
  const sheetConfigOperator = columnConfigOperator.sheetConfigOperator;
  sheetConfigOperator.fetchAndUpdateAll();
  columnConfigOperator.fetchAndUpdateColumnConfig();
  columnConfigOperator.ss.batchUpdateGSheets();
  return { sheetConfigOperator, columnConfigOperator };
}

export function generateConfigFilesSources(): string {
  const { sheetConfigOperator, columnConfigOperator } =
    syncAndFlushConfigSheets();
  return JSON.stringify({
    sheetConfigs: sheetConfigOperator.toFileSource(),
    columnConfigs: columnConfigOperator.toFileSource(),
  });
}
