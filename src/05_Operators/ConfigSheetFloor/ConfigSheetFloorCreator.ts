import { SpreadsheetBaseNamed } from "../../04_SpreadsheetNamed/ClassBases/SpreadsheetBaseNamed";
import { floorSheetNames, type FloorSheetName } from "./floorSeedLookups";
import { FloorTabColumnCreator } from "./FloorTabColumnCreator";

/**
 * Recreates missing floor columns at their Table's end, with the generated
 * column ID, seeded header and group heading, and fails closed on a missing
 * column the sync can't refill. ConfigSheetFloor runs this right after its
 * fetch and flushes only when it reports a column. Each tab's recreatable
 * table and insert live in FloorTabColumnCreator.
 * docs/generated-data.md
 */
export class ConfigSheetFloorCreator extends SpreadsheetBaseNamed {
  createMissing(): string[] {
    const tabs = floorSheetNames()
      .map((sheetName) => this._floorTab(sheetName))
      .filter((tab) => tab.hasFloorTable());
    tabs.forEach((tab) => tab.assertMissingAreRecreatable());
    const createdLines = tabs.flatMap((tab) => tab.createMissing());
    if (createdLines.length === 0) return [];
    return [`Recreated columns: ${createdLines.join("; ")}`];
  }
  private _floorTab(
    sheetName: FloorSheetName,
  ): FloorTabColumnCreator<FloorSheetName> {
    return new FloorTabColumnCreator({
      ...this.spreadsheetNamedProps,
      sheetName,
    });
  }
}
