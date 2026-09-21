import {
  protectionRangeEqual,
  protectionRangesEqual,
  type ModelableEditProtection,
  type ProtectionGridRange,
} from "../../00_Source/RawSource/EditProtection";
import {
  getColumnTraitByName,
  getSheetColumnNames,
  type ColumnName,
} from "../../01_SpreadsheetSchema/columnConfigsTypes";
import {
  configSheetFloorSeed,
  floorSeedColumnById,
  floorTabSeedByGid,
} from "../../01_SpreadsheetSchema/configSheetFloorSeed";
import { getSheetTraitByName } from "../../01_SpreadsheetSchema/sheetConfigsTypes";
import { SpreadsheetBaseNamed } from "../../04_SpreadsheetNamed/ClassBases/SpreadsheetBaseNamed";
import type { SheetNamed } from "../../04_SpreadsheetNamed/SheetNamed";
import { SpreadsheetNamed } from "../../04_SpreadsheetNamed/SpreadsheetNamed";
import { Arr } from "../../utils/Arr";
import { Obj } from "../../utils/Obj";
import {
  columnNameByHeader,
  floorSheetNames,
  type FloorSheetName,
} from "./floorSeedLookups";

type SpreadsheetConfigColumnName = ColumnName<"spreadsheetConfig">;

// Sheet indexes of the columns that say whose row it is, gathered with the floor's fetch.
export type IdentityColIndexes = Map<FloorSheetName, number[]>;

const floorWarningPrefix = "Config-sheet floor";

interface FloorDeclaration {
  description: string;
  range: ProtectionGridRange;
  unprotectedRanges: ProtectionGridRange[];
  queueAdd: () => void;
}

/**
 * Declares one whole-sheet edit warning on Spreadsheet Config, Sheet Config
 * and Column Config, with editable ranges where an edit sticks, and replaces
 * any that drifted. ConfigSheetFloor runs this after its restores.
 * docs/generated-data.md
 */
export class ConfigSheetFloorEditWarnings extends SpreadsheetBaseNamed {
  get ss(): SpreadsheetNamed {
    return new SpreadsheetNamed(this.spreadsheetNamedProps);
  }
  ensure(identityColIndexes: IdentityColIndexes): string[] {
    const report: string[] = [];
    const declarations = floorSheetNames().map((sheetName) =>
      this._sheetDeclaration(sheetName, identityColIndexes, report),
    );
    this._reconcile(declarations, report);
    return report;
  }
  private _sheetDeclaration<SN extends FloorSheetName>(
    sheetName: SN,
    identityColIndexes: IdentityColIndexes,
    report: string[],
  ): FloorDeclaration {
    const sheet = this.ss.sheet(sheetName);
    const description = floorWarningDescription(sheetName);
    const extraColumnLines = extraColumnReportLines(sheet, sheetName);
    if (extraColumnLines.length > 0) {
      report.push(`Covered added columns: ${extraColumnLines.join("; ")}`);
    }
    const unprotectedRanges = editableRanges(
      sheet,
      sheetName,
      this._carvedRowIndexesByColIndex(sheetName, identityColIndexes),
    );
    return {
      description,
      range: sheet.raw.wholeSheetGridRange,
      unprotectedRanges,
      queueAdd: () =>
        sheet.addEditWarningWholeSheet({ description, unprotectedRanges }),
    };
  }
  // Before the floor's fetch, so these ride it: a drifted column ID leaves only the Table header to find them by.
  gatherIdentityColumns(): IdentityColIndexes {
    const identityColIndexes: IdentityColIndexes = new Map();
    const identities = [
      this._identityColumns("sheetConfig", ["sheetGid"]),
      this._identityColumns("columnConfig", ["sheetGid", "columnId"]),
    ];
    identities.forEach((identity) => {
      if (identity === undefined) return;
      const { sheet, sheetName, colIndexes } = identity;
      colIndexes.forEach((colIndex) => {
        sheet.raw.column(colIndex).gatherFetchFull();
      });
      identityColIndexes.set(sheetName, colIndexes);
    });
    return identityColIndexes;
  }
  private _identityColumns<SN extends "sheetConfig" | "columnConfig">(
    sheetName: SN,
    columnNames: ColumnName<SN>[],
  ):
    { sheet: SheetNamed<SN>; sheetName: SN; colIndexes: number[] } | undefined {
    if (!this.ss.raw.gidIsActive(getSheetTraitByName(sheetName, "sheetGid"))) {
      return undefined;
    }
    const sheet = this.ss.sheet(sheetName);
    if (sheet.raw.tables.length !== 1) return undefined;
    const colIndexes = tableColIndexesByHeader(sheet, sheetName, columnNames);
    return colIndexes === undefined
      ? undefined
      : { sheet, sheetName, colIndexes };
  }
  // Row indexes as fetched, before the sync moves rows.
  private _carvedRowIndexesByColIndex(
    sheetName: FloorSheetName,
    identityColIndexes: IdentityColIndexes,
  ): Map<number, number[]> {
    if (sheetName === "sheetConfig") {
      const sheet = this.ss.sheet("sheetConfig");
      const [sheetGidCol] = identityColIndexes.get("sheetConfig") ?? [];
      if (sheetGidCol === undefined) return new Map();
      return carveOut(sheet, "sheetConfig", "letApiAccess", (rowIndex) => {
        const sheetGid = sheet.raw.column(sheetGidCol).valueOrEmpty(rowIndex);
        return (
          typeof sheetGid === "number" &&
          floorTabSeedByGid(sheetGid) !== undefined
        );
      });
    }
    if (sheetName === "columnConfig") {
      const sheet = this.ss.sheet("columnConfig");
      const [sheetGidCol, columnIdCol] =
        identityColIndexes.get("columnConfig") ?? [];
      if (sheetGidCol === undefined || columnIdCol === undefined) {
        return new Map();
      }
      return carveOut(
        sheet,
        "columnConfig",
        "emptyValueAllowed",
        (rowIndex) => {
          const sheetGid = sheet.raw.column(sheetGidCol).valueOrEmpty(rowIndex);
          const columnId = String(
            sheet.raw.column(columnIdCol).valueOrEmpty(rowIndex),
          );
          return (
            typeof sheetGid === "number" &&
            floorSeedColumnById(sheetGid, columnId) !== undefined
          );
        },
      );
    }
    return new Map();
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

function carveOut<SN extends FloorSheetName>(
  sheet: SheetNamed<SN>,
  sheetName: SN,
  columnName: ColumnName<SN>,
  isSelfDescribingRow: (rowIndex: number) => boolean,
): Map<number, number[]> {
  const colIndex = liveColumnIndexes(sheet, sheetName).get(columnName);
  if (colIndex === undefined) return new Map();
  return new Map([
    [colIndex, sheet.raw.rowIndexesFull.filter(isSelfDescribingRow)],
  ]);
}

function editableRanges<SN extends FloorSheetName>(
  sheet: SheetNamed<SN>,
  sheetName: SN,
  carvedRowIndexesByColIndex: ReadonlyMap<number, readonly number[]>,
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
      carvedRowIndexesByColIndex,
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

function tableColIndexesByHeader<SN extends FloorSheetName>(
  sheet: SheetNamed<SN>,
  sheetName: SN,
  columnNames: ColumnName<SN>[],
): number[] | undefined {
  const table = sheet.raw.activeTable;
  const colIndexes = columnNames.flatMap((columnName) => {
    const header = getColumnTraitByName(sheetName, columnName, "header");
    const column = table.columnProperties.find(
      (colProps) => colProps.columnName === header,
    );
    return column === undefined
      ? []
      : [table.startColumnIndex + column.columnIndex];
  });
  return colIndexes.length === columnNames.length ? colIndexes : undefined;
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
  carvedRowIndexesByColIndex?: ReadonlyMap<number, readonly number[]>;
}

interface RowSpan {
  startRowIndex: number;
  endRowIndex?: number;
}

function columnEditableRanges({
  sheetId,
  startRowIndex,
  endRowIndex,
  colIndexes,
  carvedRowIndexesByColIndex = new Map(),
}: ColumnEditableRangeProps): ProtectionGridRange[] {
  const colIndexesBySpans = new Map<
    string,
    { spans: RowSpan[]; colIndexes: number[] }
  >();
  colIndexes.forEach((colIndex) => {
    const spans = uncarvedRowSpans({
      startRowIndex,
      endRowIndex,
      carvedRowIndexes: carvedRowIndexesByColIndex.get(colIndex) ?? [],
    });
    const key = spansKey(spans);
    const group = colIndexesBySpans.get(key) ?? { spans, colIndexes: [] };
    group.colIndexes.push(colIndex);
    colIndexesBySpans.set(key, group);
  });
  return [...colIndexesBySpans.values()].flatMap((group) =>
    Arr.contiguousRanges(group.colIndexes).flatMap((range) =>
      group.spans.map((span) => ({
        sheetId,
        startRowIndex: span.startRowIndex,
        ...(span.endRowIndex === undefined
          ? {}
          : { endRowIndex: span.endRowIndex }),
        startColumnIndex: range.startIndex,
        endColumnIndex: range.endIndex,
      })),
    ),
  );
}

// Columns with identical spans share a key, so their ranges merge.
function spansKey(spans: readonly RowSpan[]): string {
  return JSON.stringify(spans);
}

function uncarvedRowSpans({
  startRowIndex,
  endRowIndex,
  carvedRowIndexes,
}: {
  startRowIndex: number;
  endRowIndex?: number;
  carvedRowIndexes: readonly number[];
}): RowSpan[] {
  const carved = Arr.contiguousRanges(
    carvedRowIndexes.filter(
      (rowIndex) =>
        rowIndex >= startRowIndex &&
        (endRowIndex === undefined || rowIndex < endRowIndex),
    ),
  );
  const spanStarts = [startRowIndex, ...carved.map((range) => range.endIndex)];
  const spanEnds = [...carved.map((range) => range.startIndex), endRowIndex];
  return spanStarts.flatMap((start, i) => {
    const end = spanEnds[i];
    if (end !== undefined && end <= start) return [];
    return [
      end === undefined
        ? { startRowIndex: start }
        : { startRowIndex: start, endRowIndex: end },
    ];
  });
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

function spreadsheetConfigFeedbackColumnNames(): SpreadsheetConfigColumnName[] {
  return Obj.values(configSheetFloorSeed.spreadsheetConfig.endpoints).flatMap(
    (endpoint) => [
      columnNameByHeader("spreadsheetConfig", endpoint.timeLastRan.header),
      columnNameByHeader("spreadsheetConfig", endpoint.runStatus.header),
    ],
  );
}
