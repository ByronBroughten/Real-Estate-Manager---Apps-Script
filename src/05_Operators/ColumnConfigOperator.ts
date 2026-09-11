import {
  makeImportLine,
  type ColumnConfigsGeneric,
} from "../01_generatedConfigs/makeConfigs";
import { type ValueName } from "../01_generatedConfigs/valueSchemas";
import type { SpreadsheetNamedProps } from "../04_SpreadsheetNamed/ClassBases/SpreadsheetNamedBase";
import type {
  SpreadsheetNamedState,
  UntypedHeadersBySheetTitle,
} from "../04_SpreadsheetNamed/Types/NamedState";
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
  private get untypedHeadersBySheetTitle(): UntypedHeadersBySheetTitle {
    return this.columnConfigSync.untypedHeadersBySheetTitle;
  }
  get sheetConfigSheet(): SheetConfigOperator["sheet"] {
    return this.sheetConfigOperator.sheet;
  }
  get activeValueTitles(): string[] {
    return this.sheet.column("valueTitle").valueArrFilterEmpty;
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
    this.sheet.prepFetchColumnsFull(
      "sheetGid",
      "columnId",
      "sheetTitle",
      "header",
      "isFormula",
      "valueTitle",
      "emptyValueAllowed",
    );
  }
  fetchAfterSheetConfigSynced(): this {
    this.sheetConfigOperator.assertSyncedToSpreadsheet();
    this.sheetGidsApiAccesses.forEach((sheetGid) => {
      const sheet = this.ss.raw.sheet(sheetGid);
      sheet.meta.colIdRow.gatherFetchFull();
      sheet.topRow.gatherFetchFull();
    });
    this.ss.raw.fetchAllGathered(true);
    return this;
  }
  syncToSpreadsheet() {
    this._addMissingColumnIds();
    this._pruneColumnRows();
    this._appendColumnRows();
    this._updateProgrammaticValues();
    this._logUntypedColumns();
    this.columnConfigSync.syncedToSpreadsheet = true;
    return this;
  }
  // Undefined, not "", so a fully typed spreadsheet still reports "Succeeded".
  untypedColumnsSummary(): string | undefined {
    this.assertSyncedToSpreadsheet();
    const untypedHeaders = Array.from(this.untypedHeadersBySheetTitle.values());
    if (untypedHeaders.length === 0) {
      return undefined;
    }
    const columnCount = untypedHeaders.reduce(
      (count, headers) => count + headers.length,
      0,
    );
    const sentences = [
      `Succeeded, but ${columnCount} column(s) across ${untypedHeaders.length} ` +
        `sheet(s) are untyped, so their value names were guessed. See the ` +
        `execution log for the list.`,
    ];
    const blankSampleTitles = this._blankSampleSheetTitles();
    if (blankSampleTitles.length > 0) {
      const names = blankSampleTitles.map((title) => `"${title}"`).join(", ");
      sentences.push(
        `On ${blankSampleTitles.length} of those sheet(s) the top data row ` +
          `was blank, so the guess had no sample behind it: ${names}.`,
      );
    }
    return sentences.join(" ");
  }
  // Derived, since blank facts are deliberately indistinguishable from real ones.
  private _blankSampleSheetTitles(): string[] {
    const titles: string[] = [];
    this.sheetGidsApiAccesses.forEach((sheetGid) => {
      const sheet = this.ss.raw.sheet(sheetGid);
      if (!this.untypedHeadersBySheetTitle.has(sheet.title)) return;
      if (!sheet.topDataRowIsBlank()) return;
      titles.push(sheet.title);
    });
    return titles;
  }
  private _isSheetGidApiAccesses(sheetGid: number): boolean {
    return this.sheetGidsApiAccesses.has(sheetGid);
  }
  private _addMissingColumnIds(): this {
    const col = this.sheetConfigSheet.columns(
      "sheetGid",
      "letApiAccess",
      "idPrefix",
    );
    let idsAdded = 0;

    this.sheetConfigSheet.rowIndexesActiveWithData.forEach((rowIndex) => {
      const sheetGid = col.sheetGid.value(rowIndex);
      if (this._isSheetGidApiAccesses(sheetGid)) {
        const idPrefix = col.idPrefix.value(rowIndex);
        const sheet = this.ss.raw.sheetMeta(sheetGid);
        idsAdded += sheet.addMissingColumnIds(idPrefix);
      }
    });
    Logger.log(
      `ensureColumnIds: prepared to add ${idsAdded} missing column ID(s)`,
    );
    return this;
  }
  private _pruneColumnRows(): this {
    const col = this.sheet.columns("sheetGid", "columnId");
    let staleCount = 0;
    this.sheet.rowIndexesActive.forEach((rowIndex) => {
      const sheetGid = col.sheetGid.valueOrEmpty(rowIndex);
      const columnId = col.columnId.valueOrEmpty(rowIndex);
      if (
        sheetGid === "" ||
        columnId === "" ||
        !this._isSheetGidApiAccesses(sheetGid) ||
        !this._isActiveColumnId(sheetGid, columnId)
      ) {
        this.sheet.row(rowIndex).delete();
        staleCount++;
      }
    });
    Logger.log(`_pruneColumnRows: pruned ${staleCount} stale row(s).`);
    return this;
  }
  private _isActiveColumnId(sheetGid: number, columnId: string): boolean {
    return this.ss.raw.sheetMeta(sheetGid).isActiveColumnId(columnId);
  }
  private _appendColumnRows(): this {
    const col = this.sheet.columns("sheetGid", "columnId");
    const existingColumnIds = col.columnId.valueArrFilterEmpty;

    let appendedCount = 0;
    this.sheetGidsApiAccesses.forEach((sheetGid) => {
      const { activeColumnIds } = this.ss.raw.sheetMeta(sheetGid);
      activeColumnIds.forEach((columnId) => {
        if (!existingColumnIds.includes(columnId)) {
          this.sheet.appendRowWithVals({
            sheetGid: sheetGid,
            columnId: columnId,
          });
          appendedCount++;
        }
      });
    });
    Logger.log(`_appendColumnRows: added ${appendedCount} new row(s).`);
    return this;
  }
  private _updateProgrammaticValues() {
    const col = this.sheet.columns(
      "sheetGid",
      "columnId",
      "sheetTitle",
      "header",
      "isFormula",
      "valueTitle",
    );
    let updatedValues = 0;
    this.untypedHeadersBySheetTitle.clear();
    this.sheet.rowIndexesActiveWithData.forEach((rowIndex) => {
      const sheetGid = col.sheetGid.value(rowIndex);
      const columnId = col.columnId.value(rowIndex);
      const sheetRaw = this.ss.raw.sheet(sheetGid);

      const actualSheetTitle = sheetRaw.title;
      if (col.sheetTitle.valueOrEmpty(rowIndex) !== actualSheetTitle) {
        col.sheetTitle.cell(rowIndex).updateValue(actualSheetTitle);
        updatedValues++;
      }

      const columnRaw = sheetRaw.meta.columnByActiveId(columnId);
      const actualHeader = columnRaw.activeHeader;
      if (col.header.valueOrEmpty(rowIndex) !== actualHeader) {
        col.header.cell(rowIndex).updateValue(actualHeader);
        updatedValues++;
      }

      const actualIsFormula = columnRaw.activeIsFormula;
      if (col.isFormula.valueOrEmpty(rowIndex) !== actualIsFormula) {
        col.isFormula.cell(rowIndex).updateValue(actualIsFormula);
        updatedValues++;
      }

      const actualValueTitle = columnRaw.activeValueTitle();
      if (col.valueTitle.valueOrEmpty(rowIndex) !== actualValueTitle) {
        col.valueTitle.cell(rowIndex).updateValue(actualValueTitle);
        updatedValues++;
      }

      if (columnRaw.activeDeclaredValueTitle() === null) {
        this._recordUntypedColumn(actualSheetTitle, actualHeader);
      }
    });
    Logger.log(`Corrected ${updatedValues} inaccurate Column Config cell(s).`);
  }
  private _recordUntypedColumn(sheetTitle: string, header: string): void {
    const headers = this.untypedHeadersBySheetTitle.get(sheetTitle) ?? [];
    headers.push(header);
    this.untypedHeadersBySheetTitle.set(sheetTitle, headers);
  }
  private _logUntypedColumns(): void {
    this.untypedHeadersBySheetTitle.forEach((headers, sheetTitle) => {
      Logger.log(
        `Untyped columns on "${sheetTitle}" (${headers.length}): ${headers.join(", ")}`,
      );
    });
  }
  newColumnConfigs(): ColumnConfigsGeneric {
    const sheetNamesByGid = this.sheetConfigOperator.sheetNamesByGid();
    const col = this.sheet.columns(
      "sheetGid",
      "columnId",
      "header",
      "isFormula",
      "valueTitle",
      "emptyValueAllowed",
    );
    const columnConfigs: ColumnConfigsGeneric = {};
    this.sheet.rowIndexesActiveWithData.forEach((rowIndex) => {
      const columnId = col.columnId.value(rowIndex);
      const sheetGid = col.sheetGid.value(rowIndex);
      const header = col.header.value(rowIndex);
      const valueTitle = col.valueTitle.value(rowIndex);
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
        isFormula: col.isFormula.value(rowIndex),
        emptyValueAllowed: col.emptyValueAllowed.value(rowIndex),
        customDefaultValue: null,
      };
    });
    return columnConfigs;
  }
  toFileSource(): string {
    return [
      `${makeImportLine("makeColumnConfigs")}`,
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
