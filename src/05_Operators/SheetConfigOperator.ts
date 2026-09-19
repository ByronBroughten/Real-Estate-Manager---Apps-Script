import {
  makeIdPrefixFromTitle,
  makeImportLine,
  validateIdPrefixesAreUnique,
  type IdPrefixLabel,
  type SheetConfigsBase,
} from "../01_SpreadsheetSchema/makeConfigs";
import { sheetConfigsByGid } from "../01_SpreadsheetSchema/sheetConfigsTypes";
import { Val } from "../utils/Val";
import { sheetConfigsFileSource } from "./configFileSource";
import { GenericSheetOperator } from "./GenericSheetOperator";
import {
  SpreadsheetBaseOperator,
  type ConfigSyncState,
  type OperatorProps,
} from "./SpreadsheetBaseOperator";

export class SheetConfigOperator extends GenericSheetOperator<"sheetConfig"> {
  constructor(props: OperatorProps) {
    super({
      sheetName: "sheetConfig",
      ...props,
    });
  }
  static init(): SheetConfigOperator {
    return new SheetConfigOperator(SpreadsheetBaseOperator.initOperatorProps());
  }
  get sheetConfigSync(): ConfigSyncState["sheetConfigSync"] {
    return this.configSyncState.sheetConfigSync;
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
    this.sheet.prepFetchColumnsFull("sheetGid", "sheetTitle", "letApiAccess");
    this.sheetConfigSync.prepFetchIsComplete = true;
  }
  syncToSpreadsheet() {
    this._deleteStaleSheetConfigs();
    this._appendMissingSheetConfigs();
    this._updateProgrammaticValues();
    this.sheetConfigSync.syncedToSpreadsheet = true;
  }
  private _deleteStaleSheetConfigs() {
    this.sheet.rows.forEach((row) => {
      const configGid = row.valueOrEmpty("sheetGid");
      if (configGid === "" || !this.ss.raw.gidIsActive(configGid)) {
        row.delete();
      }
    });
  }
  private _appendMissingSheetConfigs() {
    const colGid = this.sheet.column("sheetGid");
    this.ss.raw.activeSheetGids.forEach((sheetGid) => {
      if (!colGid.hasValue(sheetGid)) {
        this.sheet.appendRowWithVals({ sheetGid });
      }
    });
  }
  private _updateProgrammaticValues(): void {
    const col = this.sheet.columns("sheetGid", "sheetTitle");
    let updatedValues = 0;
    this.sheet.rowIndexesActiveWithData.forEach((rowIndex) => {
      const sheetTitle = col.sheetTitle.valueOrEmpty(rowIndex);
      const sheetGid = col.sheetGid.value(rowIndex);
      const activeSheet = this.ss.raw.sheet(sheetGid);
      if (sheetTitle !== activeSheet.title) {
        col.sheetTitle.cell(rowIndex).updateValue(activeSheet.title);
        updatedValues++;
      }
    });
    Logger.log(`Corrected ${updatedValues} inaccurate Sheet Config cells.`);
  }
  isSheetGidApiAccess(sheetGid: number): boolean {
    return this.sheetGidsApiAccesses().includes(sheetGid);
  }
  sheetGidsApiAccesses(): number[] {
    const col = this.sheet.columns("sheetGid", "letApiAccess");
    const gids: number[] = [];
    this.sheet.rowIndexesActiveWithData.forEach((rowIndex) => {
      if (col.letApiAccess.valueOrEmpty(rowIndex)) {
        gids.push(col.sheetGid.value(rowIndex));
      }
    });
    return gids;
  }
  idPrefix(sheetGid: number): string {
    return Val.assert(this._idPrefixesBySheetGid().get(sheetGid), "ID prefix");
  }
  private _idPrefixesBySheetGid(): Map<number, string> {
    const prefixesInUse = new Set<string>();
    const assigned = new Map<number, string>();
    this.sheetGidsApiAccesses().forEach((sheetGid) => {
      const sampled = this.ss.raw.sheetMeta(sheetGid).activeIdPrefix();
      if (sampled === undefined) return;
      prefixesInUse.add(sampled);
      assigned.set(sheetGid, sampled);
    });
    this.sheetGidsApiAccesses().forEach((sheetGid) => {
      if (assigned.has(sheetGid)) return;
      const generated = makeIdPrefixFromTitle(
        this.ss.raw.sheet(sheetGid).title,
        prefixesInUse,
      );
      prefixesInUse.add(generated);
      assigned.set(sheetGid, generated);
    });
    return assigned;
  }
  idPrefixChangeReport(): string | undefined {
    const changes: string[] = [];
    this.sheetGidsApiAccesses().forEach((sheetGid) => {
      const previous = sheetConfigsByGid.get(sheetGid);
      if (previous === undefined) return;
      const sampled = this.ss.raw.sheetMeta(sheetGid).activeIdPrefix();
      if (sampled === undefined || sampled === previous.idPrefix) return;
      changes.push(
        `Sheet "${this.ss.raw.sheet(sheetGid).title}" sampled ID prefix "${sampled}" differs from last generated "${previous.idPrefix}".`,
      );
    });
    if (changes.length === 0) return undefined;
    return changes.join(" ");
  }
  newSheetConfigs(): SheetConfigsBase {
    const col = this.sheet.columns("sheetGid", "sheetTitle", "letApiAccess");
    const sheetConfigs: SheetConfigsBase = {};
    const idPrefixLabels: IdPrefixLabel[] = [];
    this.sheet.rowIndexesActiveWithData.forEach((rowIndex) => {
      // Defaults false on a freshly-appended row — excluded until a human sets it true in the sheet.
      if (!col.letApiAccess.valueOrEmpty(rowIndex)) return;
      const title = col.sheetTitle.value(rowIndex);
      const sheetName = this.schema.titleToName(title);
      const sheetGid = col.sheetGid.value(rowIndex);
      const idPrefix = this.idPrefix(sheetGid);
      sheetConfigs[sheetName] = {
        sheetGid,
        idPrefix,
        hasIdColumn: this.ss.raw
          .sheetMeta(sheetGid)
          .tableHeaderRow.hasValue(this.schema.idHeader),
      };
      idPrefixLabels.push({ label: title, idPrefix });
    });
    validateIdPrefixesAreUnique(idPrefixLabels);
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
      `${makeImportLine("makeSheetConfigs")}`,
      ``,
      `export const sheetConfigs = makeSheetConfigs(${sheetConfigsFileSource(
        this.newSheetConfigs(),
      )});`,
      ``,
    ].join("\n");
  }
}
