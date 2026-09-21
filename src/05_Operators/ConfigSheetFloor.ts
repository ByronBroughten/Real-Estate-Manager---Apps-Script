import {
  getColumnTraitByName,
  type ColumnName,
} from "../01_SpreadsheetSchema/columnConfigsTypes";
import {
  configSheetFloorSeed,
  floorSeedColumns,
  type FloorSeedColumn,
} from "../01_SpreadsheetSchema/configSheetFloorSeed";
import { getSheetTraitByName } from "../01_SpreadsheetSchema/sheetConfigsTypes";
import type { SheetRaw } from "../02_SpreadsheetRaw/SheetRaw";
import { SpreadsheetBaseNamed } from "../04_SpreadsheetNamed/ClassBases/SpreadsheetBaseNamed";
import type { ColumnNamed } from "../04_SpreadsheetNamed/ColumnNamed";
import { SpreadsheetNamed } from "../04_SpreadsheetNamed/SpreadsheetNamed";
import { Obj } from "../utils/Obj";
import { Val } from "../utils/Val";
import {
  ConfigSheetFloorEditWarnings,
  type IdentityColIndexes,
} from "./ConfigSheetFloor/ConfigSheetFloorEditWarnings";
import { liveColIndex } from "./ConfigSheetFloor/floorColumnLocation";
import {
  columnNameByHeader,
  floorSheetNames,
  type FloorSheetName,
  type FloorTabName,
} from "./ConfigSheetFloor/floorSeedLookups";

interface FloorColumnRestore {
  header: string;
  columnId: string;
  groupHeading: string;
}

/**
 * Restores floor tab titles, Table names, headers, column IDs, group
 * headings, data values and column types, and has ConfigSheetFloorEditWarnings declare
 * the edit warnings. ConfigCoordinator
 * runs this at the start of every config sync; the
 * ensureConfigSheetFloor chore is the other caller.
 * docs/generated-data.md
 */
export class ConfigSheetFloor extends SpreadsheetBaseNamed {
  static init(): ConfigSheetFloor {
    return new ConfigSheetFloor(ConfigSheetFloor.initSpreadsheetNamedProps());
  }
  get ss(): SpreadsheetNamed {
    return new SpreadsheetNamed(this.spreadsheetNamedProps);
  }
  private get editWarnings(): ConfigSheetFloorEditWarnings {
    return new ConfigSheetFloorEditWarnings(this.spreadsheetNamedProps);
  }
  ensure(): string {
    const report: string[] = [];
    this._ensureTitlesAndTables(report);
    const identityColIndexes = this._fetchFloorSheets();
    this._ensureColumnLabels(report);
    this._ensureDataValues(report);
    this._ensureColumnTypes(report);
    report.push(...this.editWarnings.ensure(identityColIndexes));
    return report.join("; ");
  }
  private _ensureTitlesAndTables(report: string[]): void {
    this.ss.raw.ensureAllSheetPropertiesAreFetched();
    this._assertFloorTitlesAreOwned();
    const presentFloorSheets = floorTabNames().flatMap((sheetName) => {
      const sheetGid = getSheetTraitByName(sheetName, "sheetGid");
      if (!this.ss.raw.gidIsActive(sheetGid)) return [];
      return [
        {
          sheet: this.ss.raw.sheet(sheetGid),
          seed: configSheetFloorSeed[sheetName],
        },
      ];
    });
    presentFloorSheets.forEach(({ sheet, seed }) => {
      assertFloorTable(sheet, seed.tableName);
    });
    const titleLines: string[] = [];
    const tableNameLines: string[] = [];
    presentFloorSheets.forEach(({ sheet, seed }) => {
      if (sheet.title !== seed.title) {
        titleLines.push(`"${sheet.title}" → ${seed.title}`);
        sheet.updateTitle(seed.title);
      }
      if (sheet.tables.length !== 1) return;
      const table = Val.assert(sheet.tables[0], "floor table");
      if (table.name === seed.tableName) return;
      tableNameLines.push(
        `${seed.title}'s Table "${table.name}" → ${seed.tableName}`,
      );
      sheet.updateTableName(seed.tableName);
    });
    if (titleLines.length > 0) {
      report.push(`Restored tab titles: ${titleLines.join("; ")}`);
    }
    if (tableNameLines.length > 0) {
      report.push(`Restored Table names: ${tableNameLines.join("; ")}`);
    }
  }
  private _assertFloorTitlesAreOwned(): void {
    const ownedGidByTitle = new Map<string, number>(
      floorTabNames().map((sheetName) => [
        configSheetFloorSeed[sheetName].title,
        getSheetTraitByName(sheetName, "sheetGid"),
      ]),
    );
    this.ss.raw.activeSheetGids.forEach((sheetGid) => {
      const title = this.ss.raw.sheet(sheetGid).title;
      const ownedGid = ownedGidByTitle.get(title);
      if (ownedGid !== undefined && sheetGid !== ownedGid) {
        throw new Error(`A tab titled "${title}" is not the floor tab.`);
      }
    });
  }
  private _fetchFloorSheets(): IdentityColIndexes {
    const identityColIndexes = this.editWarnings.gatherIdentityColumns();
    floorSheetNames().forEach((sheetName) => {
      const sheetGid = getSheetTraitByName(sheetName, "sheetGid");
      if (!this.ss.raw.gidIsActive(sheetGid)) return;
      const sheet = this.ss.sheet(sheetName);
      sheet.meta.uniformRow("columnId").prepFetchFull();
      sheet.meta.uniformRow("tableHeader").prepFetchFull();
      sheet.meta.uniformRow("colGroupName").prepFetchFull();
      if (floorDataValueColumns(sheetName).length > 0) {
        sheet.row(sheet.schema.topDataRowIdx).prepFetchFull();
      }
      sheet.prepFetchEditProtections();
    });
    this.ss.fetchAllPrepped({ includeProgrammaticFacts: true });
    return identityColIndexes;
  }
  private _ensureColumnLabels(report: string[]): void {
    const headerLines: string[] = [];
    const columnIdLines: string[] = [];
    const groupHeadingLines: string[] = [];
    floorSheetNames().forEach((sheetName) => {
      const sheetGid = getSheetTraitByName(sheetName, "sheetGid");
      if (!this.ss.raw.gidIsActive(sheetGid)) return;
      const sheet = this.ss.sheet(sheetName);
      if (sheet.raw.tables.length !== 1) return;
      const meta = sheet.raw.meta;
      floorColumnsToRestore(sheetName).forEach((floorColumn) => {
        const colIndex = liveColIndex(meta, floorColumn);
        if (colIndex === undefined) return;
        const liveHeader = String(meta.tableHeaderRow.valueOrEmpty(colIndex));
        if (liveHeader !== floorColumn.header) {
          meta.tableHeaderRow.updateValue(colIndex, floorColumn.header);
          headerLines.push(
            `${sheet.raw.title} · ${liveHeader} (${floorColumn.columnId}) → ${floorColumn.header}`,
          );
        }
        const liveColumnId = String(meta.colIdRow.valueOrEmpty(colIndex));
        if (liveColumnId !== floorColumn.columnId) {
          meta.colIdRow.updateValue(colIndex, floorColumn.columnId);
          columnIdLines.push(
            `${sheet.raw.title} · ${floorColumn.header} (${liveColumnId}) → ${floorColumn.columnId}`,
          );
        }
        const liveHeading = String(
          meta.uniformRow("colGroupName").valueOrEmpty(colIndex),
        );
        if (liveHeading !== floorColumn.groupHeading) {
          meta
            .uniformRow("colGroupName")
            .updateValue(colIndex, floorColumn.groupHeading);
          groupHeadingLines.push(
            `${sheet.raw.title} · ${floorColumn.header} (${floorColumn.columnId}) → ${
              floorColumn.groupHeading === ""
                ? "(blank)"
                : floorColumn.groupHeading
            }`,
          );
        }
      });
    });
    if (headerLines.length > 0) {
      report.push(`Restored headers: ${headerLines.join("; ")}`);
    }
    if (columnIdLines.length > 0) {
      report.push(`Restored column IDs: ${columnIdLines.join("; ")}`);
    }
    if (groupHeadingLines.length > 0) {
      report.push(`Restored group headings: ${groupHeadingLines.join("; ")}`);
    }
  }
  private _ensureDataValues(report: string[]): void {
    floorSheetNames().forEach((sheetName) => {
      this._ensureSheetDataValues(sheetName, report);
    });
  }
  private _ensureSheetDataValues<SN extends FloorSheetName>(
    sheetName: SN,
    report: string[],
  ): void {
    const sheetGid = getSheetTraitByName(sheetName, "sheetGid");
    if (!this.ss.raw.gidIsActive(sheetGid)) return;
    const sheet = this.ss.sheet(sheetName);
    if (sheet.raw.tables.length !== 1) return;
    const row = sheet.raw.row(sheet.schema.topDataRowIdx);
    floorDataValueColumns(sheetName).forEach((seedColumn) => {
      const colIndex = liveColIndex(
        sheet.raw.meta,
        floorColumnRestore(sheetName, {
          header: seedColumn.header,
          groupHeading: "",
        }),
      );
      if (colIndex === undefined) return;
      const liveValue = String(row.cell(colIndex).valueOrEmpty());
      const { dataValue } = seedColumn;
      if (liveValue === dataValue) return;
      row.updateValue(colIndex, dataValue);
      report.push(
        `Restored ${seedColumn.header}: "${liveValue}" → ${dataValue}`,
      );
    });
  }
  private _ensureColumnTypes(report: string[]): void {
    const typeChangeLines = floorSheetNames().flatMap((sheetName) =>
      this._ensureSheetColumnTypes(sheetName, floorSeedColumns(sheetName)),
    );
    if (typeChangeLines.length > 0) {
      report.push(`Set column types: ${typeChangeLines.join("; ")}`);
    }
  }
  private _ensureSheetColumnTypes<SN extends FloorSheetName>(
    sheetName: SN,
    columns: readonly FloorSeedColumn[],
  ): string[] {
    const sheetGid = getSheetTraitByName(sheetName, "sheetGid");
    if (!this.ss.raw.gidIsActive(sheetGid)) return [];
    const sheet = this.ss.sheet(sheetName);
    return columns.flatMap((seedColumn) => {
      const column = sheet.column(
        columnNameByHeader(sheetName, seedColumn.header),
      );
      if (column.meta.activeColumnType === seedColumn.columnType) {
        return [];
      }
      column.meta.updateColumnType(seedColumn.columnType);
      return [`${floorColumnIdentity(column)} → ${seedColumn.columnType}`];
    });
  }
}

function floorTabNames(): FloorTabName[] {
  return Obj.keys(configSheetFloorSeed);
}

type FloorDataValueColumn = FloorSeedColumn & { dataValue: string };

function floorDataValueColumns(
  sheetName: FloorSheetName,
): FloorDataValueColumn[] {
  return floorSeedColumns(sheetName).filter(
    (seedColumn): seedColumn is FloorDataValueColumn =>
      seedColumn.dataValue !== undefined,
  );
}

function assertFloorTable(sheet: SheetRaw, tableName: string): void {
  if (sheet.tables.length === 0) {
    throw new Error(`Floor tab "${sheet.title}" has no Table.`);
  }
  if (
    sheet.tables.length > 1 &&
    !sheet.tables.some((table) => table.name === tableName)
  ) {
    throw new Error(
      `Floor tab "${sheet.title}" has several Tables and none is named ${tableName}.`,
    );
  }
}

function floorColumnsToRestore<SN extends FloorSheetName>(
  sheetName: SN,
): FloorColumnRestore[] {
  const seedColumns = configSheetFloorSeed[sheetName].columns.map((column) =>
    floorColumnRestore(sheetName, {
      header: column.header,
      groupHeading: column.columnGroupHeading,
    }),
  );
  if (sheetName !== "spreadsheetConfig") return seedColumns;
  const endpointColumns = Obj.values(
    configSheetFloorSeed.spreadsheetConfig.endpoints,
  ).flatMap((endpoint) =>
    [endpoint.timeLastRan, endpoint.runStatus].map((column) =>
      floorColumnRestore("spreadsheetConfig", {
        header: column.header,
        groupHeading: endpoint.heading,
      }),
    ),
  );
  return [...seedColumns, ...endpointColumns];
}

function floorColumnRestore<SN extends FloorSheetName>(
  sheetName: SN,
  { header, groupHeading }: Pick<FloorColumnRestore, "header" | "groupHeading">,
): FloorColumnRestore {
  const columnName = columnNameByHeader(sheetName, header);
  return {
    header,
    columnId: getColumnTraitByName(sheetName, columnName, "columnId"),
    groupHeading,
  };
}

function floorColumnIdentity<
  SN extends FloorSheetName,
  CN extends ColumnName<SN>,
>(column: ColumnNamed<SN, CN>): string {
  const header = String(column.meta.uniformCell("tableHeader").valueOrEmpty());
  return `${column.sheet.raw.title} · ${header} (${column.columnId})`;
}
