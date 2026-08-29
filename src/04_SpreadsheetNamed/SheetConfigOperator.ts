import type { ColumnName } from "../01_generatedConfigs/columnConfigsTypes";
import { type SheetConfigsBase } from "../01_generatedConfigs/sheetConfigBuilder";
import { SheetNamedBase } from "./ClassBases/SheetNamedBase";
import type { SpreadsheetNamedProps } from "./ClassBases/SpreadsheetNamedBase";
import type { ColumnNamed } from "./ColumnNamed";
import type { SheetNamed } from "./SheetNamed";
import { SpreadsheetNamed } from "./SpreadsheetNamed";
import { SpreadsheetSchemaNamed } from "./SpreadsheetSchemaNamed";

export class SheetConfigOperator extends SheetNamedBase<"sheetConfig"> {
  constructor(props: SpreadsheetNamedProps) {
    super({
      sheetName: "sheetConfig",
      ...props,
    });
  }
  static init(): SheetConfigOperator {
    return new SheetConfigOperator(
      SheetConfigOperator.initSpreadsheetNamedProps(),
    );
  }
  get sheet(): SheetNamed<"sheetConfig"> {
    return this.ss.sheet(this.sheetName);
  }
  column<CN extends ColumnName<"sheetConfig">>(
    columnName: CN,
  ): ColumnNamed<"sheetConfig", CN> {
    return this.sheet.column(columnName);
  }
  get ss(): SpreadsheetNamed {
    return new SpreadsheetNamed(this.spreadsheetNamedProps);
  }
  get schema(): SpreadsheetSchemaNamed {
    return new SpreadsheetSchemaNamed();
  }
  fetchAndUpdateAll(): this {
    this.ss.raw.fetchAllSheetProperties();
    this.ss.raw.activeSheetGids.forEach((sheetGid) => {
      this.ss.raw.sheet(sheetGid).headerRow.gatherFetchFull();
    });
    this.sheet.data.prepFetchColumnsFull(
      "sheetGid",
      "sheetTitle",
      "hasIdColumn",
      "idPrefix",
    );
    this.ss.fetchAllPrepped({ skipFetchingProperties: true });
    this._updateAll();
    return this;
  }
  private _updateAll() {
    this._deleteStaleSheetConfigs();
    this._appendMissingSheetConfigs();
    this._updateProgrammaticValues();
  }
  private _deleteStaleSheetConfigs() {
    this.sheet.data.rows.forEach((row) => {
      const configGid = row.value("sheetGid");
      if (configGid === "" || !this.ss.raw.gidIsActive(configGid)) {
        row.delete();
      }
    });
  }
  private _appendMissingSheetConfigs() {
    const colGid = this.sheet.column("sheetGid").data;
    this.ss.raw.activeSheetGids.forEach((sheetGid) => {
      if (!colGid.hasValue(sheetGid)) {
        this.sheet.data.appendRowWithVals({ sheetGid });
      }
    });
  }
  private _updateProgrammaticValues(): void {
    const col = this.sheet.data.columns(
      "sheetGid",
      "sheetTitle",
      "hasIdColumn",
    );
    let updatedValues = 0;
    this.sheet.data.rowIndexesActive.forEach((rowIndex) => {
      const sheetTitle = col.sheetTitle.value(rowIndex);
      const sheetGid = col.sheetGid.valueNotEmpty(rowIndex);
      const activeSheet = this.ss.raw.sheet(sheetGid);
      if (sheetTitle !== activeSheet.title) {
        col.sheetTitle.cell(rowIndex).updateValue(activeSheet.title);
        updatedValues++;
      }
      const hasIdCol = col.hasIdColumn.value(rowIndex);
      const actualHasIdCol = activeSheet.headerRow.hasValue("ID");
      if (hasIdCol !== actualHasIdCol) {
        col.hasIdColumn.cell(rowIndex).updateValue(actualHasIdCol);
        updatedValues++;
      }
    });
    Logger.log(`Corrected ${updatedValues} inaccurate Sheet Config cells.`);
  }
  // Pure computation from whatever is already fetched/synced in memory (via
  // fetchAndUpdateAll) — does no fetching or live-sheet writing of its own,
  // so it's safe to call after a shared sync/flush pass done alongside
  // ColumnConfigOperator (see index.ts's generateConfigFiles).
  sheetGidsApiAccesses(): number[] {
    const col = this.sheet.data.columns("sheetGid", "letApiAccess");
    const gids: number[] = [];
    this.sheet.data.rowIndexesActive.forEach((rowIndex) => {
      if (col.letApiAccess.value(rowIndex)) {
        gids.push(col.sheetGid.valueNotEmpty(rowIndex));
      }
    });
    return gids;
  }
  sheetEntries(): SheetConfigsBase {
    const col = this.sheet.data.columns(
      "sheetGid",
      "sheetTitle",
      "hasIdColumn",
      "idPrefix",
    );
    const entries: SheetConfigsBase = {};
    this.sheet.data.rowIndexesActive.forEach((rowIndex) => {
      const title = col.sheetTitle.value(rowIndex);
      const sheetName = this.schema.sheetNameFromTitle(title);
      entries[sheetName] = {
        sheetGid: col.sheetGid.valueNotEmpty(rowIndex),
        idPrefix: col.idPrefix.value(rowIndex),
        hasIdColumn: col.hasIdColumn.valueNotEmpty(rowIndex),
      };
    });
    return entries;
  }
  // Lets ColumnConfigOperator resolve a Column Config row's sheetGid to the
  // sheetName it'll be nested under in columnConfigs.ts, using this same
  // (already-synced) in-memory state rather than the stale, separately
  // deployed sheetConfigs.ts.
  sheetNamesByGid(): Map<number, string> {
    const map = new Map<number, string>();
    Object.entries(this.sheetEntries()).forEach(([sheetName, config]) => {
      map.set(config.sheetGid, sheetName);
    });
    return map;
  }
  toFileSource(): string {
    return [
      `import { makeSheetConfigs } from "./sheetConfigBuilder";`,
      ``,
      `export const sheetConfigs = makeSheetConfigs(${JSON.stringify(
        this.sheetEntries(),
        null,
        2,
      )});`,
      ``,
    ].join("\n");
  }
}
