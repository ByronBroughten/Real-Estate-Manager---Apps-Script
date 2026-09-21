import type { CellValue } from "../../00_Source/CellValues/cellValues";
import type { ColumnName } from "../../01_SpreadsheetSchema/columnConfigsTypes";
import {
  configSheetFloorSeed,
  floorSeedColumns,
  type FloorSeedColumn,
} from "../../01_SpreadsheetSchema/configSheetFloorSeed";
import { getSheetTraitByName } from "../../01_SpreadsheetSchema/sheetConfigsTypes";
import { ssConfigGet } from "../../01_SpreadsheetSchema/spreadsheetConfigTypes";
import { SpreadsheetBaseNamed } from "../../04_SpreadsheetNamed/ClassBases/SpreadsheetBaseNamed";
import { SpreadsheetNamed } from "../../04_SpreadsheetNamed/SpreadsheetNamed";
import { spreadsheetConfigHeader } from "../SpreadsheetConfigDataRow";
import { floorSheetNames, type FloorSheetName } from "./floorSeedLookups";
import { FloorTabColumnCreator } from "./FloorTabColumnCreator";

// Value Config also seeds values, so its creation is #99.
const creatableFloorTabNames = [
  "spreadsheetConfig",
  "sheetConfig",
  "columnConfig",
] as const satisfies readonly FloorSheetName[];

/**
 * Creates a missing Spreadsheet Config, Sheet Config or Column Config tab at
 * its generated GID, with its seeded Table placed by the generated layout, and
 * recreates missing floor columns at their Table's end, with the generated column ID, seeded
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
      const columns = floorSeedColumns(sheetName);
      const endRowIdx = headerRowIdx + 2;
      const endColIdx = startColIdx + columns.length;
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
          columnProperties: columns.map((column, columnIndex) => ({
            columnIndex,
            columnName: column.header,
            columnType: column.columnType,
          })),
        });
      if (sheetName === "spreadsheetConfig") {
        this._seedLayoutValues(sheetGid, columns);
      }
      return [seed.title];
    });
  }
  private _seedLayoutValues(
    sheetGid: number,
    columns: readonly FloorSeedColumn[],
  ): void {
    const headers = columns.map((column) => column.header);
    seededLayoutValues().forEach(({ header, value }) => {
      const columnIndex = headers.indexOf(header);
      if (columnIndex === -1) {
        throw new Error(
          `Spreadsheet Config seed has no column "${header}" to seed its layout value into.`,
        );
      }
      this.ss.raw.gatherAddedSheetCellRequest({
        sheetId: sheetGid,
        rowIndex: ssConfigGet("tableHeaderRowIndexBase0") + 1,
        colIndex: ssConfigGet("startTableColIndexBase0") + columnIndex,
        value,
      });
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

// Read through ssConfigGet, the same layout that placed the created Table.
function seededLayoutValues(): { header: string; value: CellValue }[] {
  const layoutValues: {
    columnName: ColumnName<"spreadsheetConfig">;
    value: CellValue;
  }[] = [
    { columnName: "idHeader", value: ssConfigGet("idHeader") },
    { columnName: "idDelimiter", value: ssConfigGet("idDelimiter") },
    {
      columnName: "startTableColumnIndexBase1",
      value: ssConfigGet("startTableColIndexBase0") + 1,
    },
    {
      columnName: "columnIdRowIndexBase1",
      value: ssConfigGet("columnIdRowIdxBase0") + 1,
    },
    {
      columnName: "columnGroupHeadingRowIndexBase1",
      value: ssConfigGet("columnGroupHeadingRowIndexBase0") + 1,
    },
    {
      columnName: "actionRowIndexBase1",
      value: ssConfigGet("actionRowIndexBase0") + 1,
    },
    {
      columnName: "tableHeaderRowIndexBase1",
      value: ssConfigGet("tableHeaderRowIndexBase0") + 1,
    },
  ];
  return layoutValues.map(({ columnName, value }) => ({
    header: spreadsheetConfigHeader(columnName),
    value,
  }));
}
