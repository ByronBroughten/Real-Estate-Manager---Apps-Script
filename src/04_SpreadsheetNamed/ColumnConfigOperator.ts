import type { TableColumnConfigs } from "../01_generatedConfigs/columnConfigBuilder";
import type { ValueName } from "../01_generatedConfigs/valueSchemas";
import { SchemaBase } from "../02_SpreadsheetRaw/BaseSchema";
import { Str } from "../utils/Str";
import { SheetNamedBase } from "./ClassBases/SheetNamedBase";
import type { SpreadsheetNamedProps } from "./ClassBases/SpreadsheetNamedBase";
import type { DataSheetNamed } from "./DataSheetNamed";
import { SheetConfigOperator } from "./SheetConfigOperator";
import type { SheetNamed } from "./SheetNamed";
import { SpreadsheetNamed } from "./SpreadsheetNamed";

export class ColumnConfigOperator extends SheetNamedBase<"columnConfig"> {
  private sheetGidsApiAccesses: Set<number>;
  constructor(props: SpreadsheetNamedProps) {
    super({
      sheetName: "columnConfig",
      ...props,
    });
    this.sheetGidsApiAccesses = new Set();
  }
  static init() {
    return new ColumnConfigOperator(
      ColumnConfigOperator.initSpreadsheetNamedProps(),
    );
  }
  get ss(): SpreadsheetNamed {
    return new SpreadsheetNamed(this.spreadsheetNamedProps);
  }
  get sheet(): SheetNamed<"columnConfig"> {
    return this.ss.sheet(this.sheetName);
  }
  get sheetData(): DataSheetNamed<"columnConfig"> {
    return this.sheet.data;
  }
  get sheetConfigOperator(): SheetConfigOperator {
    return new SheetConfigOperator(this.spreadsheetNamedProps);
  }
  get sheetConfigData(): SheetConfigOperator["sheet"]["data"] {
    return this.sheetConfigOperator.sheet.data;
  }
  get schema(): SchemaBase {
    return new SchemaBase();
  }
  fetchAndUpdateColumnConfig(): this {
    // for _initSheetGidsApiAccesses
    this.sheetConfigData.prepFetchColumnsFull("sheetGid", "letApiAccess");
    this.sheetData.prepFetchColumnsFull(
      "sheetGid",
      "columnId",
      "header",
      "isFormula",
      "valueName",
    );
    this.ss.fetchAllPrepped();
    this._initSheetGidsApiAccesses();
    this._gatherColumnIdsForSheetGidsApiAccesses();
    this.ss.fetchAllPrepped();

    this._addMissingColumnIds();
    this._pruneColumnRows();
    this._appendColumnRows();
    this._updateProgrammaticValues();
    return this;
  }
  // Pure computation from whatever is already fetched/synced in memory (via
  // fetchAndUpdateColumnConfig) — does no fetching or live-sheet writing of
  // its own. header/valueName are hand-maintained on the Column Config
  // sheet, so a freshly appended row (new columnId, not yet filled in by a
  // human) is skipped rather than emitted with garbage data.
  columnEntries(): Record<string, TableColumnConfigs> {
    const sheetNamesByGid = this.sheetConfigOperator.sheetNamesByGid();
    const col = this.sheetData.columns(
      "sheetGid",
      "columnId",
      "header",
      "isFormula",
      "valueName",
    );
    const entries: Record<string, TableColumnConfigs> = {};
    const skipped: string[] = [];
    this.sheetData.rowIndexesActive.forEach((rowIndex) => {
      const columnId = col.columnId.valueNotEmpty(rowIndex);
      const sheetGid = col.sheetGid.valueNotEmpty(rowIndex);
      const header = col.header.value(rowIndex);
      const valueName = col.valueName.value(rowIndex);
      if (!header || !valueName) {
        skipped.push(columnId);
        return;
      }
      const sheetName = sheetNamesByGid.get(sheetGid);
      if (!sheetName) {
        skipped.push(columnId);
        return;
      }
      const columnName = Str.sentenceToCamelCase(header);
      const sheetEntries = (entries[sheetName] ??= {});
      if (sheetEntries[columnName]) {
        throw new Error(
          `generateColumnConfigFileSource: duplicate column name "${columnName}" ` +
            `derived from header "${header}" on sheet "${sheetName}".`,
        );
      }
      sheetEntries[columnName] = {
        columnId,
        valueName: valueName as ValueName,
        header,
        isFormula: col.isFormula.valueNotEmpty(rowIndex),
        emptyAllowed: false,
        customDefaultValue: null,
      };
    });
    if (skipped.length > 0) {
      Logger.log(
        `generateColumnConfigFileSource: skipped ${skipped.length} column(s) ` +
          `missing header/value name or an unresolved sheet: ${skipped.join(", ")}`,
      );
    }
    return entries;
  }
  toFileSource(): string {
    return [
      `import { makeColumnConfigs } from "./columnConfigBuilder";`,
      ``,
      `export const columnConfigs = makeColumnConfigs(${JSON.stringify(
        this.columnEntries(),
        null,
        2,
      )});`,
      ``,
    ].join("\n");
  }
  private _initSheetGidsApiAccesses(): this {
    const col = this.sheetConfigData.columns("sheetGid", "letApiAccess");
    this.sheetConfigData.rowIndexesActive.forEach((rowIndex) => {
      if (col.letApiAccess.value(rowIndex)) {
        this.sheetGidsApiAccesses.add(col.sheetGid.valueNotEmpty(rowIndex));
      }
    });
    return this;
  }
  private _isSheetGidApiAccesses(sheetGid: number): boolean {
    return this.sheetGidsApiAccesses.has(sheetGid);
  }
  private _gatherColumnIdsForSheetGidsApiAccesses() {
    this.sheetGidsApiAccesses.forEach((sheetGid) => {
      const sheet = this.ss.sheetByGid(sheetGid);
      sheet.uniformRow("columnId").raw.gatherFetchFull();
    });
  }
  private _addMissingColumnIds(): this {
    const col = this.sheetConfigData.columns(
      "sheetGid",
      "letApiAccess", // for _initSheetGidsApiAccesses
    );
    let idsAdded = 0;
    this.sheetConfigData.rowIndexesActive.forEach((rowIndex) => {
      const sheetGid = col.sheetGid.value(rowIndex);
      if (sheetGid !== "" && !this._isSheetGidApiAccesses(sheetGid)) {
        const sheet = this.ss.sheetByGid(sheetGid);
        idsAdded += sheet.addMissingColumnIds();
      }
    });
    Logger.log(
      `ensureColumnIds: prepared to add ${idsAdded} missing column ID(s)`,
    );
    return this;
  }
  private _isActiveColumnId(sheetGid: number, columnId: string): boolean {
    const sheet = this.ss.sheetByGid(sheetGid);
    return sheet.uniformRow("columnId").hasValue(columnId);
  }
  private _pruneColumnRows(): this {
    const col = this.sheetData.columns("sheetGid", "columnId");
    let staleCount = 0;
    this.sheetData.rowIndexesActive.forEach((rowIndex) => {
      const columnId = col.columnId.valueNotEmpty(rowIndex);
      const sheetGid = col.sheetGid.valueNotEmpty(rowIndex);

      if (
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
  private _appendColumnRows(): this {
    const col = this.sheetData.columns("sheetGid", "columnId");
    const existingColumnIds = col.columnId.valueArr;

    let appendedCount = 0;
    this.sheetGidsApiAccesses.forEach((sheetGid) => {
      const sheet = this.ss.sheetByGid(sheetGid);
      const activeColIds = sheet.uniformRow("columnId").activeValueArr;
      activeColIds.forEach((columnId) => {
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
    // Loop through the existing rows and update the values. You'll need sheet properties and top data rows.
  }
}
