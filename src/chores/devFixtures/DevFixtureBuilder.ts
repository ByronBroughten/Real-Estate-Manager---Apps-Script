import { googleRawRequest } from "../../00_Source/GoogleSheets/GoogleSheetsAPI";
import { getSheetTraitByName } from "../../01_SpreadsheetSchema/sheetConfigsTypes";
import { ssConfigGet } from "../../01_SpreadsheetSchema/spreadsheetConfigTypes";
import { SpreadsheetBaseNamed } from "../../04_SpreadsheetNamed/ClassBases/SpreadsheetBaseNamed";
import { SpreadsheetNamed } from "../../04_SpreadsheetNamed/SpreadsheetNamed";
import {
  devFixtureId,
  devFixtureSheets,
  type DevFixtureSheet,
} from "./devFixtureSheets";

/**
 * Builds the dev spreadsheet's fixture tabs for the buildDevFixtures chore:
 * each missing tab with its Table, column types, column IDs and rows, then the
 * Sheet Config and Column Config ticks gen:configs reads. A tab that exists is
 * left alone; the ticks are checked every run. The fixtures themselves are
 * data in devFixtureSheets.ts.
 * docs/architecture/chores.md
 */
export class DevFixtureBuilder extends SpreadsheetBaseNamed {
  get ss(): SpreadsheetNamed {
    return new SpreadsheetNamed(this.spreadsheetNamedProps);
  }
  ensureFixtures(): string {
    this.ss.fetchAllSheetProperties();
    this._validateConfigFloorPresent();
    this.ss
      .sheet("sheetConfig")
      .prepFetchColumnsFull("sheetGid", "letApiAccess");
    this.ss
      .sheet("columnConfig")
      .prepFetchColumnsFull("sheetGid", "columnId", "emptyValueAllowed");
    this.ss.fetchAllPrepped({ skipFetchingProperties: true });
    const fixtures = devFixtureSheets();
    const missing = fixtures.filter(
      (fixture) => !this.ss.raw.gidIsActive(fixture.sheetGid),
    );
    missing.forEach((fixture) => this._addFixtureSheet(fixture));
    fixtures.forEach((fixture) => {
      this._ensureLetApiAccess(fixture);
      this._ensureEmptyValueAllowed(fixture);
    });
    this.ss.batchUpdateGSheets();
    if (missing.length === 0) {
      return "Every fixture tab already exists; only the config ticks were checked.";
    }
    return `Created ${missing.map((fixture) => fixture.title).join(", ")}.`;
  }
  private _validateConfigFloorPresent(): void {
    const missing = (["sheetConfig", "columnConfig"] as const).filter(
      (sheetName) =>
        !this.ss.raw.gidIsActive(getSheetTraitByName(sheetName, "sheetGid")),
    );
    if (missing.length > 0) {
      throw new Error(
        `No ${missing.join(" or ")} tab yet. Run \`npm run dev:gen:configs\` first to create the config floor.`,
      );
    }
  }
  private _addFixtureSheet(fixture: DevFixtureSheet): void {
    const { sheetGid, columns } = fixture;
    const headerRowIdx = ssConfigGet("tableHeaderRowIndexBase0");
    const startColIdx = ssConfigGet("startTableColIndexBase0");
    const rowCount = Math.max(...columns.map((column) => column.values.length));
    const endRowIdx = headerRowIdx + 1 + rowCount;
    const endColIdx = startColIdx + columns.length;
    this.ss.raw
      .gatherAddSheetRequest({
        sheetId: sheetGid,
        title: fixture.title,
        rowCount: endRowIdx,
        columnCount: endColIdx,
      })
      .gatherAddTableRequest({
        name: fixture.tableName,
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
    columns.forEach((column, columnIndex) => {
      const colIndex = startColIdx + columnIndex;
      this.ss.raw.gatherAddedSheetCellRequest({
        sheetId: sheetGid,
        rowIndex: ssConfigGet("columnIdRowIdxBase0"),
        colIndex,
        value: devFixtureId("c", fixture.idPrefix, column.key),
      });
      column.values.forEach((value, rowOffset) => {
        if (value === "") return;
        this.ss.raw.gatherAddedSheetCellRequest({
          sheetId: sheetGid,
          rowIndex: headerRowIdx + 1 + rowOffset,
          colIndex,
          value,
        });
      });
    });
    if (fixture.entryCheckboxColumnKey !== undefined) {
      this._addEntryCheckbox(fixture, fixture.entryCheckboxColumnKey);
    }
  }
  // Data validation isn't modeled yet, so the action-row checkbox goes out raw.
  private _addEntryCheckbox(fixture: DevFixtureSheet, columnKey: string): void {
    const columnIndex = fixture.columns.findIndex(
      (column) => column.key === columnKey,
    );
    if (columnIndex === -1) {
      throw new Error(`${fixture.title} has no "${columnKey}" column.`);
    }
    const rowIndex = ssConfigGet("actionRowIndexBase0");
    const colIndex = ssConfigGet("startTableColIndexBase0") + columnIndex;
    this.ss.raw
      .gatherAddedSheetCellRequest({
        sheetId: fixture.sheetGid,
        rowIndex,
        colIndex,
        value: false,
      })
      .gatherRawRequest(
        googleRawRequest({
          setDataValidation: {
            range: {
              sheetId: fixture.sheetGid,
              startRowIndex: rowIndex,
              endRowIndex: rowIndex + 1,
              startColumnIndex: colIndex,
              endColumnIndex: colIndex + 1,
            },
            rule: { condition: { type: "BOOLEAN" } },
          },
        }),
      );
  }
  private _ensureLetApiAccess(fixture: DevFixtureSheet): void {
    const sheetConfig = this.ss.sheet("sheetConfig");
    const [row] = sheetConfig.rowsFiltered({ sheetGid: fixture.sheetGid });
    if (row === undefined) {
      sheetConfig.appendRowWithVals({
        sheetGid: fixture.sheetGid,
        sheetTitle: fixture.title,
        letApiAccess: true,
      });
    } else if (row.valueOrEmpty("letApiAccess") !== true) {
      row.cell("letApiAccess").updateValue(true);
    }
  }
  private _ensureEmptyValueAllowed(fixture: DevFixtureSheet): void {
    const columnConfig = this.ss.sheet("columnConfig");
    fixture.columns.forEach(({ key, header, emptyValueAllowed }) => {
      if (emptyValueAllowed === undefined) return;
      const columnId = devFixtureId("c", fixture.idPrefix, key);
      const [row] = columnConfig.rowsFiltered({
        sheetGid: fixture.sheetGid,
        columnId,
      });
      if (row === undefined) {
        columnConfig.appendRowWithVals({
          sheetGid: fixture.sheetGid,
          columnId,
          sheetTitle: fixture.title,
          header,
          emptyValueAllowed,
        });
      } else if (row.valueOrEmpty("emptyValueAllowed") !== emptyValueAllowed) {
        row.cell("emptyValueAllowed").updateValue(emptyValueAllowed);
      }
    });
  }
}
