import { configSheetFloorSeed } from "../../01_SpreadsheetSchema/configSheetFloorSeed";
import { getSheetTraitByName } from "../../01_SpreadsheetSchema/sheetConfigsTypes";
import { ssConfigGet } from "../../01_SpreadsheetSchema/spreadsheetConfigTypes";
import { SpreadsheetBaseNamed } from "../../04_SpreadsheetNamed/ClassBases/SpreadsheetBaseNamed";
import { SpreadsheetNamed } from "../../04_SpreadsheetNamed/SpreadsheetNamed";
import { floorSheetNames, type FloorSheetName } from "./floorSeedLookups";
import { FloorTabColumnCreator } from "./FloorTabColumnCreator";

// Spreadsheet Config and Value Config also seed values, so their creation is #98 and #99.
const creatableFloorTabNames = [
  "sheetConfig",
  "columnConfig",
] as const satisfies readonly FloorSheetName[];

/**
 * Creates a missing Sheet Config or Column Config tab at its generated GID,
 * with its seeded Table placed by the generated layout, and recreates missing
 * floor columns at their Table's end, with the generated column ID, seeded
 * header and group heading, failing closed on a missing column the sync can't
 * refill. ConfigSheetFloor runs this right after its fetch and flushes only
 * when it reports something. Each tab's recreatable table and insert live in
 * FloorTabColumnCreator.
 * docs/generated-data.md
 */
export class ConfigSheetFloorCreator extends SpreadsheetBaseNamed {
  get ss(): SpreadsheetNamed {
    return new SpreadsheetNamed(this.spreadsheetNamedProps);
  }
  createMissing(): string[] {
    const report: string[] = [];
    const createdTabs = this._createMissingTabs();
    if (createdTabs.length > 0) {
      report.push(`Created tabs: ${createdTabs.join("; ")}`);
    }
    const tabs = floorSheetNames()
      .map((sheetName) => this._floorTab(sheetName))
      .filter((tab) => tab.hasFloorTable());
    tabs.forEach((tab) => tab.assertMissingAreRecreatable());
    const createdLines = tabs.flatMap((tab) => tab.createMissing());
    if (createdLines.length > 0) {
      report.push(`Recreated columns: ${createdLines.join("; ")}`);
    }
    return report;
  }
  private _createMissingTabs(): string[] {
    const headerRowIdx = ssConfigGet("tableHeaderRowIndexBase0");
    const startColIdx = ssConfigGet("startTableColIndexBase0");
    return creatableFloorTabNames.flatMap((sheetName) => {
      const sheetGid = getSheetTraitByName(sheetName, "sheetGid");
      if (this.ss.raw.gidIsActive(sheetGid)) return [];
      const seed = configSheetFloorSeed[sheetName];
      const endRowIdx = headerRowIdx + 2;
      const endColIdx = startColIdx + seed.columns.length;
      this.ss.raw
        .gatherAddSheetRequest({
          sheetId: sheetGid,
          title: seed.title,
          rowCount: endRowIdx,
          columnCount: endColIdx,
        })
        .gatherAddTableRequest({
          name: seed.tableName,
          range: {
            sheetId: sheetGid,
            startRowIndex: headerRowIdx,
            endRowIndex: endRowIdx,
            startColumnIndex: startColIdx,
            endColumnIndex: endColIdx,
          },
          columnProperties: seed.columns.map((column, columnIndex) => ({
            columnIndex,
            columnName: column.header,
            columnType: column.columnType,
          })),
        });
      return [seed.title];
    });
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
