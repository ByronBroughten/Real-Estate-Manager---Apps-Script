import {
  protectionRangeEqual,
  type ModelableEditProtection,
  type ProtectionGridRange,
} from "../00_Source/RawSource/EditProtection";
import {
  getColumnTraitByName,
  getSheetColumnNames,
  type ColumnName,
} from "../01_SpreadsheetSchema/columnConfigsTypes";
import { configSheetFloorSeed } from "../01_SpreadsheetSchema/configSheetFloorSeed";
import type { SheetNameSimple } from "../01_SpreadsheetSchema/sheetConfigsTypes";
import { ssConfigGet } from "../01_SpreadsheetSchema/spreadsheetConfigTypes";
import { SpreadsheetBaseNamed } from "../04_SpreadsheetNamed/ClassBases/SpreadsheetBaseNamed";
import type { ColumnNamed } from "../04_SpreadsheetNamed/ColumnNamed";
import type { SheetNamed } from "../04_SpreadsheetNamed/SheetNamed";
import { SpreadsheetNamed } from "../04_SpreadsheetNamed/SpreadsheetNamed";
import { Obj } from "../utils/Obj";

type SpreadsheetConfigColumnName = ColumnName<"spreadsheetConfig">;
type FloorCellKind = "header" | "column ID" | "group heading" | "data";
type FloorSheetName = Exclude<keyof typeof configSheetFloorSeed, "valueConfig">;

const floorWarningPrefix = "Config-sheet floor";

interface FloorDeclaration {
  description: string;
  range: ProtectionGridRange;
  queueAdd: () => void;
}

/**
 * Declares edit warnings on the config-sheet floor cells. ConfigOrchestrator
 * runs this at the start of every config sync; the ensureConfigSheetFloor
 * chore is the other caller.
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
    const declarations = [
      ...this._spreadsheetConfigDeclarations(report),
      ...floorDeclaration.bookkeeping(
        this.ss.sheet("sheetConfig"),
        floorColumnNames("sheetConfig"),
      ),
      ...floorDeclaration.bookkeeping(
        this.ss.sheet("columnConfig"),
        floorColumnNames("columnConfig"),
      ),
    ];
    this._reconcile(declarations, report);
    return report.join("; ");
  }
  private _fetchFloorSheets(): void {
    floorSheetNames().forEach((sheetName) => {
      const sheet = this.ss.sheet(sheetName);
      sheet.meta.uniformRow("columnId").prepFetchFull();
      sheet.meta.uniformRow("tableHeader").prepFetchFull();
      sheet.meta.uniformRow("colGroupName").prepFetchFull();
      sheet.prepFetchEditProtections();
    });
    this.ss.fetchAllPrepped();
  }
  private _spreadsheetConfigDeclarations(report: string[]): FloorDeclaration[] {
    const sheet = this.ss.sheet("spreadsheetConfig");
    const tableMenuSpaceHeader =
      configSheetFloorSeed.spreadsheetConfig.columns[0].header;
    const tableMenuSpaceName = columnNameByHeader(
      "spreadsheetConfig",
      tableMenuSpaceHeader,
    );
    const tableMenuSpace = sheet.column(tableMenuSpaceName);
    if (
      tableMenuSpace.meta.colIndex !== ssConfigGet("startTableColIndexBase0")
    ) {
      report.push(
        "Table menu space is not the first Spreadsheet Config Table column; nothing was added for that sheet.",
      );
      return [];
    }
    const feedbackColumnNames = spreadsheetConfigFeedbackColumnNames();
    return [
      ...floorDeclaration.bookkeeping(sheet, [
        tableMenuSpaceName,
        ...feedbackColumnNames,
        ...floorColumnNames("spreadsheetConfig").filter(
          (columnName) => columnName !== tableMenuSpaceName,
        ),
      ]),
      floorDeclaration.dataCell(tableMenuSpace),
      ...feedbackColumnNames.map((columnName) =>
        floorDeclaration.dataCell(sheet.column(columnName)),
      ),
      ...floorDeclaration.groupHeadings(sheet),
    ];
  }
  private _reconcile(declarations: FloorDeclaration[], report: string[]): void {
    const existing = this._floorProtections();
    const drifted: string[] = [];
    const duplicates: string[] = [];
    declarations.forEach((declaration) => {
      const key = floorMatchKey(declaration.description);
      const matches = existing.filter(
        (protection) => floorMatchKey(protection.description) === key,
      );
      const inPlace = matches.find((protection) =>
        protectionRangeEqual(protection.range, declaration.range),
      );
      if (inPlace !== undefined) {
        matches.forEach((protection) => {
          if (protection.id === inPlace.id) return;
          this._removeProtection(protection);
          duplicates.push(protection.description);
        });
        return;
      }
      matches.forEach((protection) => {
        this._removeProtection(protection);
        drifted.push(protection.description);
      });
      declaration.queueAdd();
    });
    if (drifted.length > 0) {
      report.push(`Replaced drifted: ${drifted.join("; ")}`);
    }
    if (duplicates.length > 0) {
      report.push(`Removed duplicates: ${duplicates.join("; ")}`);
    }
  }
  private _removeProtection(protection: ModelableEditProtection): void {
    floorSheetNames().forEach((sheetName) => {
      const sheet = this.ss.sheet(sheetName);
      if (sheet.schema.sheetGid !== protection.range.sheetId) return;
      sheet.removeEditProtectionById(protection.id);
    });
  }
  private _floorProtections(): ModelableEditProtection[] {
    return floorSheetNames().flatMap((sheetName) =>
      this.ss
        .sheet(sheetName)
        .editProtections()
        .flatMap((protection) => {
          if (protection.kind === "unmodelable") return [];
          if (floorMatchKey(protection.description) === undefined) return [];
          return [protection];
        }),
    );
  }
}

function floorColumnNames<SN extends FloorSheetName>(
  sheetName: SN,
): ColumnName<SN>[] {
  return configSheetFloorSeed[sheetName].columns.map((column) =>
    columnNameByHeader(sheetName, column.header),
  );
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

function spreadsheetConfigFeedbackColumnNames(): SpreadsheetConfigColumnName[] {
  return Obj.values(configSheetFloorSeed.spreadsheetConfig.endpoints).flatMap(
    (endpoint) => [
      columnNameByHeader("spreadsheetConfig", endpoint.timeLastRan.header),
      columnNameByHeader("spreadsheetConfig", endpoint.runStatus.header),
    ],
  );
}

function spreadsheetConfigGroupHeadings(): readonly string[] {
  const spreadsheetConfig = configSheetFloorSeed.spreadsheetConfig;
  return [
    ...spreadsheetConfig.columns.map((column) => column.columnGroupHeading),
    ...Obj.values(spreadsheetConfig.endpoints).map(
      (endpoint) => endpoint.heading,
    ),
  ].filter((heading) => heading !== "");
}

const floorDeclaration = {
  bookkeeping<SN extends SheetNameSimple>(
    sheet: SheetNamed<SN>,
    columnNames: readonly ColumnName<SN>[],
  ): FloorDeclaration[] {
    return columnNames.flatMap((columnName) => {
      const column = sheet.column(columnName);
      return [
        floorDeclaration.uniformCell(column, "tableHeader", "header"),
        floorDeclaration.uniformCell(column, "columnId", "column ID"),
      ];
    });
  },
  dataCell<SN extends SheetNameSimple, CN extends ColumnName<SN>>(
    column: ColumnNamed<SN, CN>,
  ): FloorDeclaration {
    const rowIndex = column.schema.topDataRowIdx;
    const cell = column.cell(rowIndex);
    const description = floorDescription(column, "data");
    return {
      description,
      range: cell.raw.gridRange,
      queueAdd: () => cell.addEditWarning({ description }),
    };
  },
  groupHeadings(sheet: SheetNamed<"spreadsheetConfig">): FloorDeclaration[] {
    const declarations: FloorDeclaration[] = [];
    let previousHeading = "";
    columnsByIndex(sheet).forEach((column) => {
      const heading = String(
        column.meta.uniformCell("colGroupName").valueOrEmpty(),
      );
      const isGroupStart =
        heading !== previousHeading &&
        spreadsheetConfigGroupHeadings().some(
          (groupHeading) => groupHeading === heading,
        );
      previousHeading = heading;
      if (!isGroupStart) return;
      declarations.push(
        floorDeclaration.uniformCell(column, "colGroupName", "group heading"),
      );
    });
    return declarations;
  },
  uniformCell<SN extends SheetNameSimple, CN extends ColumnName<SN>>(
    column: ColumnNamed<SN, CN>,
    rowName: "tableHeader" | "columnId" | "colGroupName",
    cellKind: FloorCellKind,
  ): FloorDeclaration {
    const cell = column.meta.uniformCell(rowName);
    const description = floorDescription(column, cellKind);
    return {
      description,
      range: cell.raw.gridRange,
      queueAdd: () => cell.addEditWarning({ description }),
    };
  },
};

function floorDescription<
  SN extends SheetNameSimple,
  CN extends ColumnName<SN>,
>(column: ColumnNamed<SN, CN>, cellKind: FloorCellKind): string {
  const header = String(column.meta.uniformCell("tableHeader").valueOrEmpty());
  return `${floorWarningPrefix} · ${column.sheet.raw.title} · ${header} (${column.columnId}) · ${cellKind} · warning`;
}

function columnsByIndex<SN extends SheetNameSimple>(
  sheet: SheetNamed<SN>,
): ColumnNamed<SN>[] {
  return sheet.schema.columnNames
    .map((columnName) => sheet.column(columnName))
    .sort((left, right) => left.meta.colIndex - right.meta.colIndex);
}

function floorMatchKey(description: string): string | undefined {
  const parts = description.split(" · ");
  if (parts.length !== 5 || parts[0] !== floorWarningPrefix) return undefined;
  const columnId = parts[2]?.match(/\(([^)]+)\)$/)?.[1];
  if (columnId === undefined) return undefined;
  return `${columnId} · ${parts[3]} · ${parts[4]}`;
}
