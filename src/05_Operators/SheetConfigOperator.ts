import {
  makeConfigsDirRelativeToConfigs,
  type SheetConfigsBase,
} from "../01_generatedConfigs/makeConfigs";
import type { SpreadsheetNamedProps } from "../04_SpreadsheetNamed/ClassBases/SpreadsheetNamedBase";
import type { SpreadsheetNamedState } from "../04_SpreadsheetNamed/Types/NamedState";
import { GenericSheetOperator } from "./GenericSheetOperator";

export class SheetConfigOperator extends GenericSheetOperator<"sheetConfig"> {
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
  get sheetConfigSync(): SpreadsheetNamedState["sheetConfigSync"] {
    return this.namedState.sheetConfigSync;
  }
  assertPrepFetchIsComplete() {
    if (!this.sheetConfigSync.prepFetchIsComplete) {
      throw new Error(
        "SheetConfigOperator has not yet completed its prepFetch operation.",
      );
    }
  }
  assertSyncedToSpreadsheet() {
    if (!this.sheetConfigSync.syncedToSpreadsheet) {
      throw new Error(
        "SheetConfigOperator has not yet synced to the spreadsheet.",
      );
    }
  }
  prepFetchForSync() {
    this.ss.raw.activeSheetGids.forEach((sheetGid) => {
      this.ss.sheetByGid(sheetGid).uniformRow("header").prepFetchFull();
    });
    this.sheet.data.prepFetchColumnsFull(
      "sheetGid",
      "sheetTitle",
      "hasIdColumn",
      "idPrefix",
      "letApiAccess",
    );
    this.sheetConfigSync.prepFetchIsComplete = true;
  }
  syncToSpreadsheet() {
    this._deleteStaleSheetConfigs();
    this._appendMissingSheetConfigs();
    this._updateProgrammaticValues();
    this.sheetConfigSync.syncedToSpreadsheet = true;
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
  newSheetConfigs(): SheetConfigsBase {
    const col = this.sheet.data.columns(
      "sheetGid",
      "sheetTitle",
      "hasIdColumn",
      "idPrefix",
      "letApiAccess",
    );
    const sheetConfigs: SheetConfigsBase = {};
    this.sheet.data.rowIndexesActive.forEach((rowIndex) => {
      // Defaults false on a freshly-appended row — excluded until a human sets it true in the sheet.
      if (!col.letApiAccess.value(rowIndex)) return;
      const title = col.sheetTitle.value(rowIndex);
      const sheetName = this.schema.titleToName(title);
      sheetConfigs[sheetName] = {
        sheetGid: col.sheetGid.valueNotEmpty(rowIndex),
        idPrefix: col.idPrefix.value(rowIndex),
        hasIdColumn: col.hasIdColumn.valueNotEmpty(rowIndex),
      };
    });
    return sheetConfigs;
  }
  sheetNamesByGid(): Map<number, string> {
    const map = new Map<number, string>();
    Object.entries(this.newSheetConfigs()).forEach(([sheetName, config]) => {
      map.set(config.sheetGid, sheetName);
    });
    return map;
  }
  toFileSource(): string {
    return [
      `import { makeSheetConfigs } from ${makeConfigsDirRelativeToConfigs};`,
      ``,
      `export const sheetConfigs = makeSheetConfigs(${JSON.stringify(
        this.newSheetConfigs(),
        null,
        2,
      )});`,
      ``,
    ].join("\n");
  }
}
