import {
  protectionRangeEqual,
  type ModelableEditProtection,
  type ProtectionGridRange,
} from "../00_Source/RawSource/EditProtection";
import type { ColumnName } from "../01_SpreadsheetSchema/columnConfigsTypes";
import type { SheetNameSimple } from "../01_SpreadsheetSchema/sheetConfigsTypes";
import { ssConfigGet } from "../01_SpreadsheetSchema/spreadsheetConfigTypes";
import { SpreadsheetBaseNamed } from "../04_SpreadsheetNamed/ClassBases/SpreadsheetBaseNamed";
import type { ColumnNamed } from "../04_SpreadsheetNamed/ColumnNamed";
import type { SheetNamed } from "../04_SpreadsheetNamed/SheetNamed";
import { SpreadsheetNamed } from "../04_SpreadsheetNamed/SpreadsheetNamed";

type SpreadsheetConfigColumnName = ColumnName<"spreadsheetConfig">;
type FloorCellKind = "header" | "column ID" | "group heading" | "data";
type FloorSheetName = "spreadsheetConfig" | "sheetConfig" | "columnConfig";

const floor = {
  sheetNames: ["spreadsheetConfig", "sheetConfig", "columnConfig"],
  prefix: "Config-sheet floor",
  groupHeadings: [
    "Fill Row IDs",
    "Sync Config Sheet Rows",
    "Spreadsheet Rules",
  ],
  layoutColumns: [
    "idDelimiter",
    "idHeader",
    "startTableColumnIndexBase1",
    "columnIdRowIndexBase1",
    "columnGroupHeadingRowIndexBase1",
    "actionRowIndexBase1",
    "tableHeaderRowIndexBase1",
  ],
  sheetConfigColumns: [
    "sheetGid",
    "sheetTitle",
    "idPrefix",
    "idPrefixIsUniqueOrEmpty",
    "letApiAccess",
  ],
  columnConfigColumns: [
    "sheetGid",
    "columnId",
    "sheetTitle",
    "header",
    "emptyValueAllowed",
  ],
} as const satisfies {
  sheetNames: readonly FloorSheetName[];
  prefix: string;
  groupHeadings: readonly string[];
  layoutColumns: readonly SpreadsheetConfigColumnName[];
  sheetConfigColumns: readonly ColumnName<"sheetConfig">[];
  columnConfigColumns: readonly ColumnName<"columnConfig">[];
};

interface FloorDeclaration {
  description: string;
  range: ProtectionGridRange;
  queueAdd: () => void;
}

/**
 * Declares edit warnings on the config-sheet floor cells. Callers pass the
 * framework endpoints' feedback column names; the chore is the caller today.
 * docs/generated-data.md
 */
export class ConfigSheetFloor extends SpreadsheetBaseNamed {
  static init(): ConfigSheetFloor {
    return new ConfigSheetFloor(ConfigSheetFloor.initSpreadsheetNamedProps());
  }
  get ss(): SpreadsheetNamed {
    return new SpreadsheetNamed(this.spreadsheetNamedProps);
  }
  ensure(feedbackColumnNames: readonly SpreadsheetConfigColumnName[]): string {
    this._fetchFloorSheets();
    const report: string[] = [];
    const declarations = [
      ...this._spreadsheetConfigDeclarations(feedbackColumnNames, report),
      ...floorDeclaration.bookkeeping(
        this.ss.sheet("sheetConfig"),
        floor.sheetConfigColumns,
      ),
      floorDeclaration.formulaColumn(this.ss.sheet("sheetConfig")),
      ...floorDeclaration.bookkeeping(
        this.ss.sheet("columnConfig"),
        floor.columnConfigColumns,
      ),
    ];
    this._reconcile(declarations, report);
    return report.join("\n");
  }
  private _fetchFloorSheets(): void {
    floor.sheetNames.forEach((sheetName) => {
      const sheet = this.ss.sheet(sheetName);
      sheet.meta.uniformRow("columnId").prepFetchFull();
      sheet.meta.uniformRow("tableHeader").prepFetchFull();
      sheet.meta.uniformRow("colGroupName").prepFetchFull();
      sheet.prepFetchEditProtections();
    });
    this.ss.fetchAllPrepped();
  }
  private _spreadsheetConfigDeclarations(
    feedbackColumnNames: readonly SpreadsheetConfigColumnName[],
    report: string[],
  ): FloorDeclaration[] {
    const sheet = this.ss.sheet("spreadsheetConfig");
    const tableMenuSpace = sheet.column("tableMenuSpace");
    if (
      tableMenuSpace.meta.colIndex !== ssConfigGet("startTableColIndexBase0")
    ) {
      report.push(
        "Table menu space is not the first Spreadsheet Config Table column; nothing was added for that sheet.",
      );
      return [];
    }
    return [
      ...floorDeclaration.bookkeeping(sheet, [
        "tableMenuSpace",
        ...feedbackColumnNames,
        ...floor.layoutColumns,
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
    floor.sheetNames.forEach((sheetName) => {
      const sheet = this.ss.sheet(sheetName);
      if (sheet.schema.sheetGid !== protection.range.sheetId) return;
      sheet.removeEditProtectionById(protection.id);
    });
  }
  private _floorProtections(): ModelableEditProtection[] {
    return floor.sheetNames.flatMap((sheetName) =>
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
  formulaColumn(sheet: SheetNamed<"sheetConfig">): FloorDeclaration {
    const column = sheet.column("idPrefixIsUniqueOrEmpty");
    const startRowIndex = column.schema.topDataRowIdx;
    const description = floorDescription(column, "data");
    return {
      description,
      range: column.gridRangeFromRow(startRowIndex),
      queueAdd: () =>
        column.addEditWarningFromRow(startRowIndex, { description }),
    };
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
        floor.groupHeadings.some((groupHeading) => groupHeading === heading);
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
  return `${floor.prefix} · ${column.sheet.raw.title} · ${header} (${column.columnId}) · ${cellKind} · warning`;
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
  if (parts.length !== 5 || parts[0] !== floor.prefix) return undefined;
  const columnId = parts[2]?.match(/\(([^)]+)\)$/)?.[1];
  if (columnId === undefined) return undefined;
  return `${columnId} · ${parts[3]} · ${parts[4]}`;
}
