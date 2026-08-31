import {
  makeConfigsDirRelativeToConfigs,
  type ColumnConfigsGeneric,
} from "../01_generatedConfigs/makeConfigs";
import { type ValueName } from "../01_generatedConfigs/valueSchemas";
import type { SpreadsheetNamedProps } from "../04_SpreadsheetNamed/ClassBases/SpreadsheetNamedBase";
import type { SpreadsheetNamedState } from "../04_SpreadsheetNamed/Types/NamedState";
import { Str } from "../utils/Str";
import { GenericSheetOperator } from "./GenericSheetOperator";
import { SheetConfigOperator } from "./SheetConfigOperator";
import { ValueConfigOperator } from "./ValueConfigOperator";

export class ColumnConfigOperator extends GenericSheetOperator<"columnConfig"> {
  constructor(props: SpreadsheetNamedProps) {
    super({
      sheetName: "columnConfig",
      ...props,
    });
  }
  static init() {
    return new ColumnConfigOperator(
      ColumnConfigOperator.initSpreadsheetNamedProps(),
    );
  }
  get columnConfigSync(): SpreadsheetNamedState["columnConfigSync"] {
    return this.namedState.columnConfigSync;
  }
  get sheetConfigOperator(): SheetConfigOperator {
    return new SheetConfigOperator(this.spreadsheetNamedProps);
  }
  get valueConfigOperator(): ValueConfigOperator {
    return new ValueConfigOperator(this.spreadsheetNamedProps);
  }
  get sheetConfigData(): SheetConfigOperator["sheet"]["data"] {
    return this.sheetConfigOperator.sheet.data;
  }
  get activeValueTitles(): string[] {
    return this.sheetData.column("valueTitle").valueArrNotEmpty;
  }
  // Derived fresh each call, not cached — a stored field goes stale across
  // this coordinator's per-access getter rebuilds.
  private get sheetGidsApiAccesses(): Set<number> {
    return new Set(this.sheetConfigOperator.sheetGidsApiAccesses());
  }
  assertSyncedToSpreadsheet() {
    if (!this.columnConfigSync.syncedToSpreadsheet) {
      throw new Error(
        "ColumnConfigOperator has not yet synced to the spreadsheet.",
      );
    }
  }
  prepFetchWithSheetConfig() {
    this.sheetConfigOperator.assertPrepFetchIsComplete();
    this.sheetData.prepFetchColumnsFull(
      "sheetGid",
      "columnId",
      "sheetTitle",
      "header",
      "isFormula",
      "valueTitle",
    );
  }
  fetchAfterSheetConfigSynced(): this {
    this.sheetConfigOperator.assertSyncedToSpreadsheet();
    this.sheetGidsApiAccesses.forEach((sheetGid) => {
      const sheet = this.ss.raw.sheet(sheetGid);
      sheet.uniformRow("columnId").gatherFetchFull();
      sheet.data.topRow.gatherFetchFull();
    });
    this.ss.raw.fetchAllGathered(true);
    return this;
  }
  syncToSpreadsheet() {
    this._addMissingColumnIds();
    this._pruneColumnRows();
    this._appendColumnRows();
    this._updateProgrammaticValues();
    this.columnConfigSync.syncedToSpreadsheet = true;
    return this;
  }
  private _isSheetGidApiAccesses(sheetGid: number): boolean {
    return this.sheetGidsApiAccesses.has(sheetGid);
  }
  private _addMissingColumnIds(): this {
    const col = this.sheetConfigData.columns(
      "sheetGid",
      "letApiAccess",
      "idPrefix",
    );
    let idsAdded = 0;

    this.sheetConfigData.rowIndexesActive.forEach((rowIndex) => {
      const sheetGid = col.sheetGid.valueNotEmpty(rowIndex);
      if (this._isSheetGidApiAccesses(sheetGid)) {
        const idPrefix = col.idPrefix.valueNotEmpty(rowIndex);
        const sheet = this.ss.raw.sheet(sheetGid);
        idsAdded += sheet.addMissingColumnIds(idPrefix);
      }
    });
    Logger.log(
      `ensureColumnIds: prepared to add ${idsAdded} missing column ID(s)`,
    );
    return this;
  }
  private _pruneColumnRows(): this {
    const col = this.sheetData.columns("sheetGid", "columnId");
    let staleCount = 0;
    this.sheetData.rowIndexesActive.forEach((rowIndex) => {
      const sheetGid = col.sheetGid.value(rowIndex);
      const columnId = col.columnId.value(rowIndex);
      if (
        sheetGid === "" ||
        columnId === "" ||
        !this._isSheetGidApiAccesses(sheetGid) ||
        !this._isActiveColumnId(sheetGid, columnId)
      ) {
        this.sheetData.row(rowIndex).delete();
        staleCount++;
      }
    });
    Logger.log(
      `pruneColTraits: queued ${staleCount} stale row(s) for deletion.`,
    );
    return this;
  }
  private _isActiveColumnId(sheetGid: number, columnId: string): boolean {
    return this.ss.raw.sheet(sheetGid).isActiveColumnId(columnId);
  }
  private _appendColumnRows(): this {
    const col = this.sheetData.columns("sheetGid", "columnId");
    const existingColumnIds = col.columnId.valueArr;

    let appendedCount = 0;
    this.sheetGidsApiAccesses.forEach((sheetGid) => {
      const { activeColumnIds } = this.ss.raw.sheet(sheetGid);
      activeColumnIds.forEach((columnId) => {
        if (!existingColumnIds.includes(columnId)) {
          this.sheetData.appendRowWithVals({
            sheetGid: sheetGid,
            columnId: columnId,
          });
        }
        appendedCount++;
      });
    });
    Logger.log(
      `appendColumnRows: queued ${appendedCount} new row(s) for append.`,
    );
    return this;
  }
  private _updateProgrammaticValues() {
    const col = this.sheetData.columns(
      "sheetGid",
      "columnId",
      "sheetTitle",
      "header",
      "isFormula",
      "valueTitle",
    );
    let updatedValues = 0;
    this.sheetData.rowIndexesActive.forEach((rowIndex) => {
      const sheetGid = col.sheetGid.valueNotEmpty(rowIndex);
      const columnId = col.columnId.valueNotEmpty(rowIndex);
      const sheetRaw = this.ss.raw.sheet(sheetGid);

      const actualSheetTitle = sheetRaw.title;
      if (col.sheetTitle.value(rowIndex) !== actualSheetTitle) {
        col.sheetTitle.cell(rowIndex).updateValue(actualSheetTitle);
        updatedValues++;
      }

      const columnRaw = sheetRaw.columnByActiveId(columnId);
      const actualHeader = columnRaw.activeHeader;
      if (col.header.value(rowIndex) !== actualHeader) {
        col.header.cell(rowIndex).updateValue(actualHeader);
        updatedValues++;
      }

      const actualIsFormula = columnRaw.data.activeIsFormula;
      if (col.isFormula.value(rowIndex) !== actualIsFormula) {
        col.isFormula.cell(rowIndex).updateValue(actualIsFormula);
        updatedValues++;
      }

      const actualValueTitle = columnRaw.activeValueTitle();
      if (col.valueTitle.value(rowIndex) !== actualValueTitle) {
        col.valueTitle.cell(rowIndex).updateValue(actualValueTitle);
        updatedValues++;
      }
    });
    Logger.log(`Corrected ${updatedValues} inaccurate Column Config cell(s).`);
  }
  newColumnConfigs(): ColumnConfigsGeneric {
    const sheetNamesByGid = this.sheetConfigOperator.sheetNamesByGid();
    const col = this.sheetData.columns(
      "sheetGid",
      "columnId",
      "header",
      "isFormula",
      "valueTitle",
    );
    const columnConfigs: ColumnConfigsGeneric = {};
    this.sheetData.rowIndexesActive.forEach((rowIndex) => {
      const columnId = col.columnId.valueNotEmpty(rowIndex);
      const sheetGid = col.sheetGid.valueNotEmpty(rowIndex);
      const header = col.header.valueNotEmpty(rowIndex);
      const valueTitle = col.valueTitle.valueNotEmpty(rowIndex);
      const sheetName = sheetNamesByGid.get(sheetGid);
      if (!sheetName) {
        throw new Error(
          `generateColumnConfigFileSource: column "${columnId}" references sheetGid ` +
            `${sheetGid}, which has no corresponding sheet name in Sheet Config.`,
        );
      }
      const columnName = Str.sentenceToCamelCase(header);
      if (!columnConfigs[sheetName]) {
        columnConfigs[sheetName] = {};
      }
      const tableColumnConfigs = columnConfigs[sheetName];
      if (tableColumnConfigs[columnName]) {
        throw new Error(
          `generateColumnConfigFileSource: duplicate column name "${columnName}" ` +
            `derived from header "${header}" on sheet "${sheetName}".`,
        );
      }
      tableColumnConfigs[columnName] = {
        columnId,
        header,
        valueName: this.schema.titleToName(valueTitle) as ValueName,
        isFormula: col.isFormula.valueNotEmpty(rowIndex),
        emptyAllowed: false,
        customDefaultValue: null,
      };
    });
    return columnConfigs;
  }
  toFileSource(): string {
    return [
      `import { makeColumnConfigs } from ${makeConfigsDirRelativeToConfigs};`,
      ``,
      `export const columnConfigs = makeColumnConfigs(${JSON.stringify(
        this.newColumnConfigs(),
        null,
        2,
      )});`,
      ``,
    ].join("\n");
  }
}
