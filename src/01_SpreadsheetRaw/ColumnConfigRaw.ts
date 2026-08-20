import {
  makeStructuredConfig,
  type CellValue,
  type CellValueName,
} from "../00_base/base";
import { configGet } from "../00_base/spreadsheetConfig";
import { SchemaBase } from "../03_SpreadsheetIndexed/SchemaBase";
import { SpecificSheetRawBase } from "./ClassBases/SpecificSheetRawBase";
import type { SpreadsheetRawProps } from "./ClassBases/SpreadsheetRawBase";
import { SheetConfigRaw } from "./SheetConfigRaw";
import type { SheetRaw } from "./SheetRaw";
import { SpecificSheetRaw } from "./SpecificSheetRaw";
import { SpreadsheetRaw } from "./SpreadsheetRaw";

const headerToValueNameAuto = makeStructuredConfig(
  {} as Record<string, CellValueName>,
  {
    "Sheet GID": "number",
    "Sheet name": "string",
    "Column ID": "string",
    "Column name": "string",
    "Is formula": "boolean",
    "Value name": "string",
    "Is api status and run": "boolean",
  } as const,
);
const headerToValueNameUser = makeStructuredConfig(
  {} as Record<string, CellValueName>,
  {
    "Custom default value": "boolean" as CellValueName,
    "Empty is allowed": "boolean" as CellValueName,
  } as const,
);
const headerToValueName = {
  ...headerToValueNameAuto,
  ...headerToValueNameUser,
} as const;

type HeaderToValueName = typeof headerToValueName;

export class ColumnConfigRaw extends SpecificSheetRawBase<HeaderToValueName> {
  constructor({ ...rest }: SpreadsheetRawProps) {
    super({
      headerToValueName: headerToValueName,
      sheetGid: configGet("columnConfigGid"),
      ...rest,
    });
  }
  static init() {
    return new ColumnConfigRaw(ColumnConfigRaw.initSpreadsheetRawProps());
  }
  get ss(): SpreadsheetRaw {
    return new SpreadsheetRaw(this.spreadsheetRawProps);
  }
  get sheetConfig(): SheetConfigRaw {
    return new SheetConfigRaw(this.spreadsheetRawProps);
  }
  get schema(): SchemaBase {
    return new SchemaBase();
  }
  get sSheet(): SpecificSheetRaw<HeaderToValueName> {
    return new SpecificSheetRaw<HeaderToValueName>({
      headerToValueName: this.headerToValueName,
      ...this.sheetRawProps,
    });
  }
  addMissingColumnIds(): void {
    this.sheetConfig.sSheet.prepFetchPrerequisitesForRawColumns();
    this.ss.fetchAllPrepped();
    this.sheetConfig.sSheet.prepFetchDataColumnsUsingHeaders(
      "Sheet GID",
      "Let api access traits",
      "ID prefix",
    );
    this.ss.fetchAllPrepped();

    const gidCol = this.sheetConfig.column("Sheet GID").data;
    const idPrefixCol = this.sheetConfig.column("ID prefix").data;
    const includedSheetGids = this._includedSheetGids();
    this._fetchColumnIdRowsForSheets(includedSheetGids);

    let idsAdded = 0;
    this.sheetConfig.sheet.activeDataRowIndexes.forEach((rowIndex) => {
      const sheetGid = gidCol.dataValue(rowIndex);
      if (!includedSheetGids.has(sheetGid)) return;

      const idPrefix = idPrefixCol.dataValue(rowIndex);
      if (typeof idPrefix !== "string" || !idPrefix) {
        throw new Error(
          `SheetConfigRaw: Sheet GID ${sheetGid} has "Let api access traits" true but no valid "ID prefix" value.`,
        );
      }
      const sheet = this.ss.sheet(sheetGid);
      idsAdded += sheet.addMissingColumnIds(idPrefix);
    });
    Logger.log(
      `ensureColumnIds: prepared to add ${idsAdded} missing column ID(s)`,
    );
  }
  // Queues deletion of stale column-trait rows into changesToSave without
  // sending a batchUpdate, so it can be chained with other gathering methods
  // before a single shared flush (e.g. via ss.batchUpdateGSheets()). A row is
  // stale if its Column ID no longer exists on its sheet, or its Sheet GID
  // isn't marked "Make schema for API" = true in SheetConfigRaw.
  pruneColTraits(): ColumnConfigRaw {
    this.sheetConfig.sSheet.prepFetchPrerequisitesForRawColumns();
    this.sSheet.prepFetchPrerequisitesForRawColumns();
    this.ss.fetchAllPrepped();

    this.sheetConfig.sSheet.prepFetchDataColumnsUsingHeaders(
      "Sheet GID",
      "Let api access traits",
    );
    this.sSheet.prepFetchDataColumnsUsingHeaders("Column ID", "Sheet GID");
    this.ss.fetchAllPrepped();

    const includedSheetGids = this._includedSheetGids();
    this._fetchColumnIdRowsForSheets(includedSheetGids);
    const activeColumnIdToSheet =
      this._existingColumnIdToSheet(includedSheetGids);

    const columnIdCol = this.column("Column ID").data;
    const sheetGidCol = this.column("Sheet GID").data;

    let staleCount = 0;
    this.sheet.activeDataRowIndexes.forEach((rowIndex) => {
      const columnId = columnIdCol.dataValue(rowIndex);
      const sheetGid = sheetGidCol.dataValue(rowIndex);

      const hasInactiveColumnId = !activeColumnIdToSheet.has(columnId);
      const belongsToExcludedSheet = !includedSheetGids.has(sheetGid);

      if (hasInactiveColumnId || belongsToExcludedSheet) {
        this.sheet.dataRow(rowIndex).delete();
        staleCount++;
      }
    });
    Logger.log(
      `pruneColTraits: queued ${staleCount} stale row(s) for deletion.`,
    );
    return this;
  }
  // Queues appending a row for every active column that isn't yet
  // documented in this sheet, into changesToSave without sending a
  // batchUpdate, so it can be chained the same way pruneColTraits is. Only
  // columns from sheets marked "Make schema for API" = true in
  // SheetConfigRaw are considered.
  appendColumnRows(): ColumnConfigRaw {
    this.sheetConfig.sSheet.prepFetchPrerequisitesForRawColumns();
    this.sSheet.prepFetchPrerequisitesForRawColumns();
    this.ss.fetchAllPrepped();

    this.sheetConfig.sSheet.prepFetchDataColumnsUsingHeaders(
      "Sheet GID",
      "Let api access traits",
    );
    this.sSheet.prepFetchDataColumnsUsingHeaders("Column ID");
    this.ss.fetchAllPrepped();

    const includedSheetGids = this._includedSheetGids();
    this._fetchColumnIdRowsForSheets(includedSheetGids);
    const activeColumnIdToSheet =
      this._existingColumnIdToSheet(includedSheetGids);

    const existingColumnIds = new Set(
      this.column("Column ID").data.dataValueArr,
    );

    const columnIdCol = this.column("Column ID");
    const sheetGidCol = this.column("Sheet GID");
    const sheetNameCol = this.column("Sheet name");

    let appendedCount = 0;
    activeColumnIdToSheet.forEach((sheet, columnId) => {
      if (existingColumnIds.has(columnId)) return;
      existingColumnIds.add(columnId); // guard against duplicate IDs across sheets

      this.sheet.appendDataRowValues(
        new Map<number, CellValue>([
          [columnIdCol.colIndex, columnId],
          [sheetGidCol.colIndex, sheet.sheetGid],
          [sheetNameCol.colIndex, this.schema.sheetNameFromTitle(sheet.title)],
        ]),
      );
      appendedCount++;
    });
    Logger.log(
      `appendColumnRows: queued ${appendedCount} new row(s) for append.`,
    );
    return this;
  }
  // Fetches every active column ID belonging to the given sheets, mapped to
  // the sheet it came from. Requires _fetchColumnIdRowsForSheets to have
  // already fetched columnId rows for these same sheetGids.
  private _existingColumnIdToSheet(
    sheetGids: Set<number>,
  ): Map<string, SheetRaw> {
    const columnIdToSheet = new Map<string, SheetRaw>();
    sheetGids.forEach((sheetGid) => {
      const sheet = this.ss.sheet(sheetGid);
      sheet.fullDataColIndexes.forEach((colIndex) => {
        const columnId = sheet.colIdRow.uniformValue(colIndex);
        if (columnId) columnIdToSheet.set(columnId, sheet);
      });
    });
    return columnIdToSheet;
  }
  // Fetches properties + the columnId uniform row for exactly the given
  // sheets, rather than every active sheet in the spreadsheet.
  private _fetchColumnIdRowsForSheets(sheetGids: Set<number>): void {
    sheetGids.forEach((sheetGid) => {
      const sheet = this.ss.sheet(sheetGid);
      sheet.prepFetchPropertiesOnly();
      sheet.prepFetchFullUniformRow("columnId");
    });
    this.ss.fetchAllPrepped();
  }
  private _includedSheetGids(): Set<number> {
    const sheetGidCol = this.sheetConfig.column("Sheet GID").data;
    const makeSchemaCol = this.sheetConfig.column("Let api access traits").data;

    const includedSheetGids = new Set<number>();
    this.sheetConfig.sheet.activeDataRowIndexes.forEach((rowIndex) => {
      if (makeSchemaCol.dataValue(rowIndex)) {
        includedSheetGids.add(sheetGidCol.dataValue(rowIndex));
      }
    });
    return includedSheetGids;
  }
}
