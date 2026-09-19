import {
  protectionRangeEqual,
  protectionRangesEqual,
  type ModelableEditProtection,
  type ProtectionGridRange,
} from "../00_Source/RawSource/EditProtection";
import {
  getColumnTraitByName,
  getSheetColumnNames,
  type ColumnName,
} from "../01_SpreadsheetSchema/columnConfigsTypes";
import {
  configSheetFloorSeed,
  type FloorSeedColumn,
} from "../01_SpreadsheetSchema/configSheetFloorSeed";
import { SpreadsheetBaseNamed } from "../04_SpreadsheetNamed/ClassBases/SpreadsheetBaseNamed";
import type { ColumnNamed } from "../04_SpreadsheetNamed/ColumnNamed";
import type { SheetNamed } from "../04_SpreadsheetNamed/SheetNamed";
import { SpreadsheetNamed } from "../04_SpreadsheetNamed/SpreadsheetNamed";
import { Arr } from "../utils/Arr";
import { Obj } from "../utils/Obj";

type SpreadsheetConfigColumnName = ColumnName<"spreadsheetConfig">;
type FloorSheetName = Exclude<keyof typeof configSheetFloorSeed, "valueConfig">;

const floorWarningPrefix = "Config-sheet floor";

interface FloorDeclaration {
  description: string;
  range: ProtectionGridRange;
  unprotectedRanges: ProtectionGridRange[];
  queueAdd: () => void;
}

/**
 * Declares one whole-sheet edit warning on Spreadsheet Config, Sheet
 * Config and Column Config, with editable ranges where an edit sticks,
 * and sets floor columns back to their seeded types. ConfigOrchestrator
 * runs this at the start of every config sync; the
 * ensureConfigSheetFloor chore is the other caller.
 * docs/generated-data.md
 */
export class ConfigSheetFloor extends SpreadsheetBaseNamed {
  static init(): ConfigSheetFloor {
    return new ConfigSheetFloor(ConfigSheetFloor.initSpreadsheetNamedProps());
  }
  get ss(): SpreadsheetNamed {
    return new SpreadsheetNamed(this.spreadsheetNamedProps);
  }
  ensure(): string {
    this._fetchFloorSheets();
    const report: string[] = [];
    this._ensureColumnTypes(report);
    const declarations = floorSheetNames().map((sheetName) =>
      this._sheetDeclaration(sheetName, report),
    );
    this._reconcile(declarations, report);
    return report.join("; ");
  }
  private _fetchFloorSheets(): void {
    floorSheetNames().forEach((sheetName) => {
      const sheet = this.ss.sheet(sheetName);
      sheet.meta.uniformRow("columnId").prepFetchFull();
      sheet.meta.uniformRow("tableHeader").prepFetchFull();
      sheet.prepFetchEditProtections();
    });
    this.ss.fetchAllPrepped({ includeProgrammaticFacts: true });
  }
  private _ensureColumnTypes(report: string[]): void {
    const typeChangeLines = floorSheetNames().flatMap((sheetName) =>
      this._ensureSheetColumnTypes(sheetName, floorSeedColumns(sheetName)),
    );
    if (typeChangeLines.length > 0) {
      report.push(`Set column types: ${typeChangeLines.join("; ")}`);
    }
  }
  private _ensureSheetColumnTypes<SN extends FloorSheetName>(
    sheetName: SN,
    columns: readonly FloorSeedColumn[],
  ): string[] {
    const sheet = this.ss.sheet(sheetName);
    return columns.flatMap((seedColumn) => {
      const column = sheet.column(
        columnNameByHeader(sheetName, seedColumn.header),
      );
      if (column.meta.activeColumnType === seedColumn.columnType) {
        return [];
      }
      column.meta.updateColumnType(seedColumn.columnType);
      return [`${floorColumnIdentity(column)} → ${seedColumn.columnType}`];
    });
  }
  private _sheetDeclaration<SN extends FloorSheetName>(
    sheetName: SN,
    report: string[],
  ): FloorDeclaration {
    const sheet = this.ss.sheet(sheetName);
    const description = floorWarningDescription(sheetName);
    const extraColumnLines = extraColumnReportLines(sheet, sheetName);
    if (extraColumnLines.length > 0) {
      report.push(`Covered added columns: ${extraColumnLines.join("; ")}`);
    }
    const unprotectedRanges = editableRanges(sheet, sheetName);
    return {
      description,
      range: sheet.raw.wholeSheetGridRange,
      unprotectedRanges,
      queueAdd: () =>
        sheet.addEditWarningWholeSheet({ description, unprotectedRanges }),
    };
  }
  private _reconcile(declarations: FloorDeclaration[], report: string[]): void {
    const existing = this._floorProtections();
    const claimed = new Set<number>();
    const removed = new Set<number>();
    const drifted: string[] = [];
    declarations.forEach((declaration) => {
      const matches = existing.filter(
        (protection) => protection.description === declaration.description,
      );
      const inPlace = matches.find(
        (protection) =>
          protectionRangeEqual(protection.range, declaration.range) &&
          protectionRangesEqual(
            protection.unprotectedRanges,
            declaration.unprotectedRanges,
          ),
      );
      if (inPlace !== undefined) {
        claimed.add(inPlace.id);
        return;
      }
      matches.forEach((protection) => {
        this._removeProtection(protection);
        removed.add(protection.id);
        drifted.push(protection.description);
      });
      declaration.queueAdd();
    });
    existing.forEach((protection) => {
      if (claimed.has(protection.id) || removed.has(protection.id)) return;
      this._removeProtection(protection);
    });
    if (drifted.length > 0) {
      report.push(`Replaced drifted: ${drifted.join("; ")}`);
    }
  }
  private _floorProtections(): ModelableEditProtection[] {
    return floorSheetNames().flatMap((sheetName) =>
      this.ss
        .sheet(sheetName)
        .editProtections()
        .flatMap((protection) => {
          if (protection.kind === "unmodelable") return [];
          if (!protection.description.startsWith(floorWarningPrefix)) {
            return [];
          }
          return [protection];
        }),
    );
  }
  private _removeProtection(protection: ModelableEditProtection): void {
    floorSheetNames().forEach((sheetName) => {
      const sheet = this.ss.sheet(sheetName);
      if (sheet.schema.sheetGid !== protection.range.sheetId) return;
      sheet.removeEditProtectionById(protection.id);
    });
  }
}

function floorWarningDescription(sheetName: FloorSheetName): string {
  return `${floorWarningPrefix} · ${configSheetFloorSeed[sheetName].title} · warning`;
}

function extraColumnReportLines<SN extends FloorSheetName>(
  sheet: SheetNamed<SN>,
  sheetName: SN,
): string[] {
  return extraColumnIndexes(sheet, sheetName).map(
    (colIndex) =>
      `${sheet.raw.title} · ${String(sheet.raw.meta.tableHeaderRow.valueOrEmpty(colIndex))}`,
  );
}

function extraColumnIndexes<SN extends FloorSheetName>(
  sheet: SheetNamed<SN>,
  sheetName: SN,
): number[] {
  const namedIndexes = new Set(liveColumnIndexes(sheet, sheetName).values());
  return sheet.raw.fullTableColIndexes.filter(
    (colIndex) => !namedIndexes.has(colIndex),
  );
}

function editableRanges<SN extends FloorSheetName>(
  sheet: SheetNamed<SN>,
  sheetName: SN,
): ProtectionGridRange[] {
  const liveIndexes = liveColumnIndexes(sheet, sheetName);
  const editableDataColIndexes = [
    ...editableDataColumnNames(sheetName).flatMap((columnName) => {
      const colIndex = liveIndexes.get(columnName);
      return colIndex === undefined ? [] : [colIndex];
    }),
    ...extraColumnIndexes(sheet, sheetName),
  ];
  const sheetId = sheet.schema.sheetGid;
  const ranges = [
    ...columnEditableRanges({
      sheetId,
      startRowIndex: sheet.schema.actionRowIndex,
      endRowIndex: sheet.schema.actionRowIndex + 1,
      colIndexes:
        sheetName === "spreadsheetConfig"
          ? spreadsheetConfigSelectorIndexes(liveIndexes)
          : [],
    }),
    ...columnEditableRanges({
      sheetId,
      startRowIndex: sheet.schema.topDataRowIdx,
      colIndexes: editableDataColIndexes,
    }),
  ];
  return ranges.sort(compareProtectionRanges);
}

function liveColumnIndexes<SN extends FloorSheetName>(
  sheet: SheetNamed<SN>,
  sheetName: SN,
): Map<ColumnName<SN>, number> {
  const indexes = new Map<ColumnName<SN>, number>();
  const meta = sheet.raw.meta;
  getSheetColumnNames(sheetName).forEach((columnName) => {
    const columnId = getColumnTraitByName(sheetName, columnName, "columnId");
    const header = getColumnTraitByName(sheetName, columnName, "header");
    const byId = meta.fullTableColIndexes.find(
      (colIndex) => String(meta.colIdRow.valueOrEmpty(colIndex)) === columnId,
    );
    if (byId !== undefined) {
      indexes.set(columnName, byId);
      return;
    }
    const byHeader = meta.fullTableColIndexes.find(
      (colIndex) =>
        String(meta.tableHeaderRow.valueOrEmpty(colIndex)) === header,
    );
    if (byHeader !== undefined) indexes.set(columnName, byHeader);
  });
  return indexes;
}

function editableDataColumnNames<SN extends FloorSheetName>(
  sheetName: SN,
): ColumnName<SN>[] {
  const excluded = new Set<string>(excludedDataColumnNames(sheetName));
  return getSheetColumnNames(sheetName).filter(
    (columnName) => !excluded.has(columnName),
  );
}

function excludedDataColumnNames(sheetName: FloorSheetName): readonly string[] {
  const bySheet = {
    spreadsheetConfig: [
      "tableMenuSpace",
      ...spreadsheetConfigFeedbackColumnNames(),
    ],
    sheetConfig: ["sheetGid", "sheetTitle"],
    columnConfig: ["sheetGid", "columnId", "sheetTitle", "header"],
  } satisfies Record<FloorSheetName, readonly string[]>;
  return bySheet[sheetName];
}

function spreadsheetConfigSelectorIndexes(
  liveIndexes: ReadonlyMap<string, number>,
): number[] {
  return Obj.values(configSheetFloorSeed.spreadsheetConfig.endpoints).flatMap(
    (endpoint) => {
      const colIndex = liveIndexes.get(
        columnNameByHeader("spreadsheetConfig", endpoint.timeLastRan.header),
      );
      return colIndex === undefined ? [] : [colIndex];
    },
  );
}

interface ColumnEditableRangeProps {
  sheetId: number;
  startRowIndex: number;
  endRowIndex?: number;
  colIndexes: number[];
}

function columnEditableRanges({
  sheetId,
  startRowIndex,
  endRowIndex,
  colIndexes,
}: ColumnEditableRangeProps): ProtectionGridRange[] {
  return Arr.contiguousRanges(colIndexes).map((range) => ({
    sheetId,
    startRowIndex,
    ...(endRowIndex === undefined ? {} : { endRowIndex }),
    startColumnIndex: range.startIndex,
    endColumnIndex: range.endIndex,
  }));
}

function compareProtectionRanges(
  left: ProtectionGridRange,
  right: ProtectionGridRange,
): number {
  const leftRow = "startRowIndex" in left ? left.startRowIndex : -1;
  const rightRow = "startRowIndex" in right ? right.startRowIndex : -1;
  if (leftRow !== rightRow) return leftRow - rightRow;
  const leftCol = "startColumnIndex" in left ? (left.startColumnIndex ?? 0) : 0;
  const rightCol =
    "startColumnIndex" in right ? (right.startColumnIndex ?? 0) : 0;
  return leftCol - rightCol;
}

function columnNameByHeader<SN extends FloorSheetName>(
  sheetName: SN,
  header: string,
): ColumnName<SN> {
  const columnName = getSheetColumnNames(sheetName).find(
    (name) => getColumnTraitByName(sheetName, name, "header") === header,
  );
  if (columnName === undefined) {
    throw new Error(
      `Floor seed header ${JSON.stringify(header)} is not a column on ${sheetName}.`,
    );
  }
  return columnName;
}

function floorSheetNames(): FloorSheetName[] {
  return Obj.keys(configSheetFloorSeed).filter(
    (sheetName): sheetName is FloorSheetName =>
      configSheetFloorSeed[sheetName].columns.length > 0,
  );
}

function floorSeedColumns(
  sheetName: FloorSheetName,
): readonly FloorSeedColumn[] {
  if (sheetName !== "spreadsheetConfig") {
    return configSheetFloorSeed[sheetName].columns;
  }
  return [
    ...configSheetFloorSeed.spreadsheetConfig.columns,
    ...Obj.values(configSheetFloorSeed.spreadsheetConfig.endpoints).flatMap(
      (endpoint) => [endpoint.timeLastRan, endpoint.runStatus],
    ),
  ];
}

function spreadsheetConfigFeedbackColumnNames(): SpreadsheetConfigColumnName[] {
  return Obj.values(configSheetFloorSeed.spreadsheetConfig.endpoints).flatMap(
    (endpoint) => [
      columnNameByHeader("spreadsheetConfig", endpoint.timeLastRan.header),
      columnNameByHeader("spreadsheetConfig", endpoint.runStatus.header),
    ],
  );
}

function floorColumnIdentity<
  SN extends FloorSheetName,
  CN extends ColumnName<SN>,
>(column: ColumnNamed<SN, CN>): string {
  const header = String(column.meta.uniformCell("tableHeader").valueOrEmpty());
  return `${column.sheet.raw.title} · ${header} (${column.columnId})`;
}
