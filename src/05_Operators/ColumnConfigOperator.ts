import type { TableColumnConfigs } from "../01_generatedConfigs/columnConfigBuilder";
import {
  valueConfigNames,
  type ValueConfigName,
} from "../01_generatedConfigs/valueConfigsTypes";
import { type ValueName } from "../01_generatedConfigs/valueSchemas";
import type { CellRaw } from "../02_SpreadsheetRaw/ClassBases/CellRaw";
import type { DataColumnRaw } from "../02_SpreadsheetRaw/ClassBases/DataColumnRaw";
import type { SpreadsheetNamedProps } from "../04_SpreadsheetNamed/ClassBases/SpreadsheetNamedBase";
import { ValueConfigOperator } from "../04_SpreadsheetNamed/ValueConfigOperator";
import { Str } from "../utils/Str";
import { Val, type PureValueName } from "../utils/Val";
import { GenericSheetOperator } from "./GenericSheetOperator";
import { SheetConfigOperator } from "./SheetConfigOperator";

export class ColumnConfigOperator extends GenericSheetOperator<"columnConfig"> {
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
  get sheetConfigOperator(): SheetConfigOperator {
    return new SheetConfigOperator(this.spreadsheetNamedProps);
  }
  get valueConfigOperator(): ValueConfigOperator {
    return new ValueConfigOperator(this.spreadsheetNamedProps);
  }
  get sheetConfigData(): SheetConfigOperator["sheet"]["data"] {
    return this.sheetConfigOperator.sheet.data;
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
      "valueTitle",
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
      "valueTitle",
    );
    let updatedValues = 0;
    this.sheetData.rowIndexesActive.forEach((rowIndex) => {
      const sheetGid = col.sheetGid.valueNotEmpty(rowIndex);
      const columnId = col.columnId.valueNotEmpty(rowIndex);
      const sheetNamed = this.ss.sheetByGid(sheetGid);
      const sheetRaw = sheetNamed.raw;
      const colIndex = sheetNamed.indexed.column(columnId).colIndex;

      const actualSheetTitle = sheetRaw.title;
      if (col.sheetTitle.value(rowIndex) !== actualSheetTitle) {
        col.sheetTitle.cell(rowIndex).updateValue(actualSheetTitle);
        updatedValues++;
      }

      const actualHeader = sheetRaw.headerRow.value(colIndex);
      if (col.header.value(rowIndex) !== actualHeader) {
        col.header.cell(rowIndex).updateValue(actualHeader);
        updatedValues++;
      }

      const dataCell = sheetRaw
        .dataRowRaw(this.baseSchema.topDataRowIdx)
        .cell(colIndex);
      const dataColumn = sheetRaw.data.column(colIndex);
      const actualIsFormula = dataColumn.activeIsFormula;
      if (col.isFormula.value(rowIndex) !== actualIsFormula) {
        col.isFormula.cell(rowIndex).updateValue(actualIsFormula);
        updatedValues++;
      }

      const actualValueTitle = this._actualValueTitle({
        header: actualHeader,
        dataCell,
        dataColumn,
      });
      if (col.valueTitle.value(rowIndex) !== actualValueTitle) {
        col.valueTitle.cell(rowIndex).updateValue(actualValueTitle);
        updatedValues++;
      }
    });
    Logger.log(`Corrected ${updatedValues} inaccurate Column Config cell(s).`);
  }
  private _actualValueTitle({
    header,
    dataCell,
    dataColumn,
  }: ActualValueNameProps): ValueName {
    if (header === "ID") {
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
      const candidate = Val.assert(
        match[1],
        "valueConfig name match",
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
  // Pure computation from whatever is already fetched/synced in memory (via
  // fetchAndUpdateColumnConfig) — does no fetching or live-sheet writing of
  // its own. header/valueName/sheetGid resolution are all guaranteed by a
  // completed fetchAndUpdateColumnConfig run (_updateProgrammaticValues
  // corrects header/valueName for every active row; Google Sheets itself
  // never leaves a native table's header cell blank; _pruneColumnRows drops
  // any row whose sheetGid isn't in the freshly-synced Sheet Config), so a
  // row still failing one of these checks means the sync didn't actually
  // complete — that's a bug to surface, not data to silently drop.
  newColumnConfigs(): Record<string, TableColumnConfigs> {
    const sheetNamesByGid = this.sheetConfigOperator.sheetNamesByGid();
    const col = this.sheetData.columns(
      "sheetGid",
      "columnId",
      "header",
      "isFormula",
      "valueTitle",
    );
    const columnConfigs: Record<string, TableColumnConfigs> = {};
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
      const tableColumnConfigs = (columnConfigs[sheetName] ??= {});
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
      `import { makeColumnConfigs } from "./columnConfigBuilder";`,
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

interface ActualValueNameProps {
  header: string;
  dataCell: CellRaw;
  dataColumn: DataColumnRaw;
}
