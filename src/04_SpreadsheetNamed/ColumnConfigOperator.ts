import type { TableColumnConfigs } from "../01_generatedConfigs/columnConfigBuilder";
import {
  valueConfigNames,
  type ValueConfigName,
} from "../01_generatedConfigs/valueConfigsTypes";
import type { ValueName } from "../01_generatedConfigs/valueSchemas";
import { SchemaBase } from "../02_SpreadsheetRaw/BaseSchema";
import type { CellRaw } from "../02_SpreadsheetRaw/ClassBases/CellRaw";
import type { DataColumnRaw } from "../02_SpreadsheetRaw/ClassBases/DataColumnRaw";
import { Str } from "../utils/Str";
import { Val, type PureValueName } from "../utils/Val";
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
      "sheetTitle",
      "header",
      "isFormula",
      "valueName",
    );
    this.ss.fetchAllPrepped();
    this._initSheetGidsApiAccesses();
    this._gatherColumnIdsForSheetGidsApiAccesses();
    this._gatherActualColumnFactsForSheetGidsApiAccesses();
    this.ss.fetchAllPrepped({
      includeProgrammaticFacts: true,
    });

    this._addMissingColumnIds();
    this._pruneColumnRows();
    this._appendColumnRows();
    this._updateProgrammaticValues();
    return this;
  }
  // Pure computation from whatever is already fetched/synced in memory (via
  // fetchAndUpdateColumnConfig) — does no fetching or live-sheet writing of
  // its own. header/valueName are normally corrected by
  // _updateProgrammaticValues before this runs; a row still missing either
  // (e.g. read via a partial sync that skipped that step) is skipped rather
  // than emitted with garbage data.
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
    this.sheetGidsApiAccesses = new Set(
      this.sheetConfigOperator.sheetGidsApiAccesses(),
    );
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
  // For _updateProgrammaticValues: the header row (actual header text) and
  // the top data row (actual isFormula/valueName facts) aren't fetched by
  // anything above.
  private _gatherActualColumnFactsForSheetGidsApiAccesses() {
    this.sheetGidsApiAccesses.forEach((sheetGid) => {
      const sheet = this.ss.sheetByGid(sheetGid);
      sheet.uniformRow("header").raw.gatherFetchFull();
      const rawSheet = sheet.raw;
      rawSheet.dataRowRaw(rawSheet.schema.topDataRowIdx).gatherFetchFull();
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
  private _isActiveColumnId(sheetGid: number, columnId: string): boolean {
    return this.ss.sheetByGid(sheetGid).isActiveColumnId(columnId);
  }
  private _appendColumnRows(): this {
    const col = this.sheetData.columns("sheetGid", "columnId");
    const existingColumnIds = col.columnId.valueArr;

    let appendedCount = 0;
    this.sheetGidsApiAccesses.forEach((sheetGid) => {
      const { activeColumnIds } = this.ss.sheetByGid(sheetGid);
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
      "valueName",
    );
    let updatedValues = 0;
    this.sheetData.rowIndexesActive.forEach((rowIndex) => {
      const sheetGid = col.sheetGid.valueNotEmpty(rowIndex);
      const columnId = col.columnId.valueNotEmpty(rowIndex);
      const namedSheet = this.ss.sheetByGid(sheetGid);
      const sheet = namedSheet.raw;
      const colIndex = namedSheet.indexed.column(columnId).colIndex;

      const actualSheetTitle = sheet.title;
      if (col.sheetTitle.value(rowIndex) !== actualSheetTitle) {
        col.sheetTitle.cell(rowIndex).updateValue(actualSheetTitle);
        updatedValues++;
      }

      const actualHeader = sheet.headerRow.value(colIndex);
      if (col.header.value(rowIndex) !== actualHeader) {
        col.header.cell(rowIndex).updateValue(actualHeader);
        updatedValues++;
      }

      const dataCell = sheet
        .dataRowRaw(sheet.schema.topDataRowIdx)
        .cell(colIndex);
      const dataColumn = sheet.column(colIndex).data;
      const actualIsFormula = dataColumn.activeIsFormula;
      if (col.isFormula.value(rowIndex) !== actualIsFormula) {
        col.isFormula.cell(rowIndex).updateValue(actualIsFormula);
        updatedValues++;
      }

      const actualValueName = this._actualValueName({
        header: actualHeader,
        dataCell,
        dataColumn,
      });
      if (col.valueName.value(rowIndex) !== actualValueName) {
        col.valueName.cell(rowIndex).updateValue(actualValueName);
        updatedValues++;
      }
    });
    Logger.log(`Corrected ${updatedValues} inaccurate Column Config cell(s).`);
  }
  private _actualValueName({
    header,
    dataCell,
    dataColumn,
  }: ActualValueNameProps): ValueName {
    if (header === "Base ID") {
      return "id";
    }
    return (
      this._actualValidationValueName(dataColumn) ??
      this._actualPrimitiveValueName(dataCell, dataColumn)
    );
  }
  // A column's live data-validation formula, e.g. `=valueConfig[Charge Description]`
  // (still the current convention), names one of the enums in valueConfigs.ts.
  private _actualValidationValueName(
    dataColumn: DataColumnRaw,
  ): ValueConfigName | null {
    for (const rawValue of dataColumn.sheet.columnValidationValues(
      dataColumn.colIndex,
    )) {
      const match = rawValue.match(/^=valueConfig\[(.+)\]$/);
      if (!match) continue;
      const candidate = Str.sentenceToCamelCase(
        Val.assert(match[1], "valueConfig name match"),
      ) as ValueConfigName;
      if (valueConfigNames.includes(candidate)) {
        return candidate;
      }
    }
    return null;
  }
  private _actualPrimitiveValueName(
    dataCell: CellRaw,
    dataColumn: DataColumnRaw,
  ): PureValueName {
    const value = dataCell.value();
    if (typeof value === "boolean") {
      return "boolean";
    }
    if (typeof value === "number") {
      const formatType = dataColumn.activeNumberFormatType;
      if (
        formatType === "DATE" ||
        formatType === "DATE_TIME" ||
        formatType === "TIME"
      ) {
        return "date";
      }
      return "number";
    }
    return "string";
  }
}

interface ActualValueNameProps {
  header: string;
  dataCell: CellRaw;
  dataColumn: DataColumnRaw;
}
