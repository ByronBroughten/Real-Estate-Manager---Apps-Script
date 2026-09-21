import {
  configSheetFloorSeed,
  type FloorTabName,
} from "../../01_SpreadsheetSchema/configSheetFloorSeed";
import { getSheetTraitByName } from "../../01_SpreadsheetSchema/sheetConfigsTypes";

export type SheetsChangeType =
  GoogleAppsScript.Events.SheetsOnChange["changeType"];

const unwarnedFloorTab: FloorTabName = "valueConfig";

export function floorChangeToast(
  changeType: SheetsChangeType,
  liveTitlesByGid: ReadonlyMap<number, string>,
): string | null {
  const { title } = configSheetFloorSeed[unwarnedFloorTab];
  const liveTitle = liveTitlesByGid.get(
    getSheetTraitByName(unwarnedFloorTab, "sheetGid"),
  );
  if (
    changeType === "OTHER" &&
    liveTitle !== undefined &&
    liveTitle !== title
  ) {
    return `${title}'s tab title is managed and will revert to ${title} on the next config sync.`;
  }
  if (changeType === "REMOVE_GRID" && liveTitle === undefined) {
    return `${title} was deleted. Undo now to restore it: the next config sync recreates it empty.`;
  }
  return null;
}
