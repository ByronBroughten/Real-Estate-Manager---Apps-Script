import type { SheetChange } from "../../00_Source/PlatformEvents/sheetChange";
import {
  configSheetFloorSeed,
  type FloorTabName,
} from "../../01_SpreadsheetSchema/configSheetFloorSeed";
import { getSheetTraitByName } from "../../01_SpreadsheetSchema/sheetConfigsTypes";

const unwarnedFloorTab: FloorTabName = "valueConfig";

export function floorChangeToast(
  change: SheetChange,
  liveTitlesByGid: ReadonlyMap<number, string>,
): string | null {
  const { title } = configSheetFloorSeed[unwarnedFloorTab];
  const liveTitle = liveTitlesByGid.get(
    getSheetTraitByName(unwarnedFloorTab, "sheetGid"),
  );
  if (change === "other" && liveTitle !== undefined && liveTitle !== title) {
    return `${title}'s tab title is managed and will revert to ${title} on the next config sync.`;
  }
  if (change === "sheetRemoved" && liveTitle === undefined) {
    return `${title} was deleted. Undo now to restore it: the next config sync recreates it empty.`;
  }
  return null;
}
