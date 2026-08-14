import {
  makeStructuredConfig,
  type CellValue,
  type CellValueName,
} from "../../00_traitPrecursors/base";
import { configGet } from "../../00_traitPrecursors/spreadsheetConfig";
import { SchemaBase } from "../../01_SchemaIndexed/SchemaBase";
import type { SpreadsheetRawProps } from "../ClassBases/SpreadsheetRawBase";
import type { SheetRaw } from "../SheetRaw";
import { SpecificSheetRawBase } from "./Base/SpecificSheetRawBase";
import { SheetConfigRaw } from "./SheetConfigRaw";
import { SpecificSheetRaw } from "./SpecificSheetRaw";

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
      headerToValueName,
      sheetGid: configGet("columnConfigGid"),
      ...rest,
    });
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
    this.ss.fetchAll();
    this.sheetConfig.sSheet.prepFetchDataColumnsOfFetchedHeaders(
      "Sheet GID",
      "Make schema for API",
      "ID prefix",
    );
    this.ss.fetchAll();

    const gidCol = this.sheetConfig.column("Sheet GID");
    const idPrefixCol = this.sheetConfig.column("ID prefix");
    const includedSheetGids = this._includedSheetGids();
    this._fetchColumnIdRowsForSheets(includedSheetGids);

    let idsAdded = 0;
    this.sheetConfig.sheet.dataRowIndexes.forEach((rowIndex) => {
      const sheetGid = gidCol.dataValue(rowIndex);
      if (!includedSheetGids.has(sheetGid)) return;

      const idPrefix = idPrefixCol.dataValue(rowIndex);
      if (typeof idPrefix !== "string" || !idPrefix) {
        throw new Error(
          `SheetConfigRaw: Sheet GID ${sheetGid} has "Make schema for API" true but no valid "ID prefix" value.`,
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
    this.ss.fetchAll();

    this.sheetConfig.sSheet.prepFetchDataColumnsOfFetchedHeaders(
      "Sheet GID",
      "Make schema for API",
    );
    this.sSheet.prepFetchDataColumnsOfFetchedHeaders("Column ID", "Sheet GID");
    this.ss.fetchAll();

    const includedSheetGids = this._includedSheetGids();
    this._fetchColumnIdRowsForSheets(includedSheetGids);
    const activeColumnIdToSheet =
      this._activeColumnIdToSheet(includedSheetGids);

    const columnIdCol = this.column("Column ID");
    const sheetGidCol = this.column("Sheet GID");

    let staleCount = 0;
    this.sheet.dataRowIndexes.forEach((rowIndex) => {
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
    this.ss.fetchAll();

    this.sheetConfig.sSheet.prepFetchDataColumnsOfFetchedHeaders(
      "Sheet GID",
      "Make schema for API",
    );
    this.sSheet.prepFetchDataColumnsOfFetchedHeaders("Column ID");
    this.ss.fetchAll();

    const includedSheetGids = this._includedSheetGids();
    this._fetchColumnIdRowsForSheets(includedSheetGids);
    const activeColumnIdToSheet =
      this._activeColumnIdToSheet(includedSheetGids);

    const existingColumnIds = new Set(this.column("Column ID").dataValueArr);

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
  private _activeColumnIdToSheet(
    sheetGids: Set<number>,
  ): Map<string, SheetRaw> {
    const columnIdToSheet = new Map<string, SheetRaw>();
    sheetGids.forEach((sheetGid) => {
      const sheet = this.ss.sheet(sheetGid);
      sheet.activeColumnIdxs.forEach((colIdx) => {
        const columnId = sheet.colIdRow.value(colIdx);
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
      sheet.prepFetchProperties();
      sheet.prepFetchFullUniformRow("columnId");
    });
    this.ss.fetchAll();
  }
  private _includedSheetGids(): Set<number> {
    const sheetGidCol = this.sheetConfig.column("Sheet GID");
    const makeSchemaCol = this.sheetConfig.column("Make schema for API");

    const includedSheetGids = new Set<number>();
    this.sheetConfig.sheet.dataRowIndexes.forEach((rowIndex) => {
      if (makeSchemaCol.dataValue(rowIndex)) {
        includedSheetGids.add(sheetGidCol.dataValue(rowIndex));
      }
    });
    return includedSheetGids;
  }
}
