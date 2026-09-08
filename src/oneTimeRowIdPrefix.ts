// ONE-TIME MIGRATION — delete this file and its two wrappers in index.ts after the run.
// Prepends "r:" to every stored row ID that predates the prefix, both in ID columns
// and in the link columns (unit's Property ID, etc.) that hold another sheet's row ID.

import { AppsScript } from "./00_base/AppsScript";
import { Val } from "./utils/Val";

const PREFIX = "r:";
const SHEET_CONFIG_TITLE = "Sheet Config";
const ID_PREFIX_HEADER = "ID prefix";
const HEADER_ROW = 4; // 1-based; spreadsheetConfig.headerRowIndexBase0 + 1
const TOP_DATA_ROW = 5; // 1-based; spreadsheetConfig.topDataRowIdxBase0 + 1
const ROW_CHUNK = 500;
const MAX_REQUESTS_PER_BATCH = 500;
const MAX_SAMPLES = 5;

interface CellChange {
  row: number;
  col: number;
  from: string;
  to: string;
}

interface ColumnTally {
  count: number;
  samples: string[];
}

export function oneTimeRowIdPrefixDryRun(): string {
  return runOneTimeRowIdPrefix(false);
}

export function oneTimeRowIdPrefixApply(): string {
  return runOneTimeRowIdPrefix(true);
}

function runOneTimeRowIdPrefix(apply: boolean): string {
  const ssId = AppsScript.projectProperties("realEstateSpreadsheetId");
  if (!ssId) {
    throw new Error("No 'realEstateSpreadsheetId' script property was found.");
  }
  const ss = SpreadsheetApp.openById(ssId);
  const prefixes = readIdPrefixes(ss);
  const group = `(?:${prefixes.join("|")})`;
  // A bare row ID is "<sheet prefix>:<7 id chars>"; the migrated form has "r:" in
  // front and the column-ID form has "c:", so neither can match these.
  const isBareRowId = new RegExp(`^${group}:[A-Za-z0-9_-]{7}$`);
  const holdsBareRowId = new RegExp(
    `(?:^|[^A-Za-z0-9_:-])${group}:[A-Za-z0-9_-]{7}(?![A-Za-z0-9_-])`,
  );
  const formulaHardcodesPrefix = new RegExp(`["']${group}:`);

  const report: string[] = [];
  const hardcoded: string[] = [];
  const embedded: string[] = [];
  const aboveData: string[] = [];
  let totalChanges = 0;
  let totalFormulaDerived = 0;
  let totalRequests = 0;

  for (const sheet of ss.getSheets()) {
    const title = sheet.getName();
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    if (lastRow < 1 || lastCol < 1) continue;

    const changes: CellChange[] = [];
    const perColumn = new Map<number, ColumnTally>();
    const formulaPerColumn = new Map<number, ColumnTally>();
    let headers: unknown[] = [];

    for (let start = 1; start <= lastRow; start += ROW_CHUNK) {
      const numRows = Math.min(ROW_CHUNK, lastRow - start + 1);
      const range = sheet.getRange(start, 1, numRows, lastCol);
      const values = range.getValues();
      const formulas = range.getFormulas();
      if (start === 1 && lastRow >= HEADER_ROW) {
        headers = values[HEADER_ROW - 1] ?? [];
      }
      for (let r = 0; r < numRows; r++) {
        const row = start + r;
        const valueRow = values[r] ?? [];
        const formulaRow = formulas[r] ?? [];
        for (let c = 0; c < lastCol; c++) {
          const col = c + 1;
          const value = valueRow[c];
          const formula = String(formulaRow[c] ?? "");
          const where = `${title}!${a1(row, col)}`;
          if (formula !== "") {
            if (formulaHardcodesPrefix.test(formula)) {
              pushCapped(
                hardcoded,
                `${where}: ${formula.replace(/\s+/g, " ").slice(0, 120)}`,
              );
            } else if (typeof value === "string" && isBareRowId.test(value)) {
              tally(formulaPerColumn, col, value);
              totalFormulaDerived += 1;
            }
            continue;
          }
          if (typeof value !== "string" || value === "") continue;
          if (isBareRowId.test(value)) {
            if (row < TOP_DATA_ROW) {
              pushCapped(aboveData, `${where}: ${value}`);
              continue;
            }
            changes.push({ row, col, from: value, to: PREFIX + value });
            tally(perColumn, col, value);
          } else if (holdsBareRowId.test(value)) {
            pushCapped(embedded, `${where}: ${value.slice(0, 120)}`);
          }
        }
      }
    }

    if (changes.length === 0 && formulaPerColumn.size === 0) continue;
    report.push(`\n${title} — ${changes.length} cell(s) to rewrite`);
    for (const [col, tallied] of sortedEntries(perColumn)) {
      report.push(
        `  ${a1Col(col)} ${headerAt(headers, col)}: ${tallied.count} × e.g. ${tallied.samples.join(", ")}`,
      );
    }
    for (const [col, tallied] of sortedEntries(formulaPerColumn)) {
      report.push(
        `  ${a1Col(col)} ${headerAt(headers, col)}: ${tallied.count} formula cell(s) currently yielding a bare ID — should self-heal`,
      );
    }

    totalChanges += changes.length;
    if (apply && changes.length > 0) {
      totalRequests += writeChanges(ssId, sheet.getSheetId(), changes);
    }
  }

  const head = [
    apply ? "APPLIED" : "DRY RUN — nothing was written",
    `ID prefixes recognized: ${prefixes.join(", ")}`,
    `Cells rewritten: ${totalChanges}${apply ? ` (in ${totalRequests} update request(s))` : ""}`,
    `Formula cells currently yielding a bare ID: ${totalFormulaDerived}`,
  ];
  return [
    ...head,
    ...report,
    ...section(
      "NEEDS MANUAL REVIEW — formulas with a hardcoded ID prefix",
      hardcoded,
    ),
    ...section(
      "NEEDS MANUAL REVIEW — bare IDs embedded in a larger string",
      embedded,
    ),
    ...section(
      "NEEDS MANUAL REVIEW — bare IDs above the first data row",
      aboveData,
    ),
  ].join("\n");
}

function readIdPrefixes(
  ss: GoogleAppsScript.Spreadsheet.Spreadsheet,
): string[] {
  const sheet = ss.getSheetByName(SHEET_CONFIG_TITLE);
  if (!sheet) throw new Error(`No "${SHEET_CONFIG_TITLE}" sheet was found.`);
  const rows = sheet
    .getRange(
      HEADER_ROW,
      1,
      sheet.getLastRow() - HEADER_ROW + 1,
      sheet.getLastColumn(),
    )
    .getValues();
  const headerRow = rows[0] ?? [];
  const prefixCol = headerRow.findIndex(
    (h) => String(h).trim() === ID_PREFIX_HEADER,
  );
  if (prefixCol < 0) {
    throw new Error(
      `No "${ID_PREFIX_HEADER}" column in "${SHEET_CONFIG_TITLE}".`,
    );
  }
  const found = new Set<string>();
  for (const row of rows.slice(1)) {
    const prefix = String(row[prefixCol] ?? "").trim();
    if (prefix) found.add(prefix.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&"));
  }
  if (found.size === 0) throw new Error("No ID prefixes were found.");
  // Longest first so the alternation can't settle for a shorter prefix.
  return [...found].sort((a, b) => b.length - a.length);
}

function writeChanges(
  ssId: string,
  sheetId: number,
  changes: CellChange[],
): number {
  const sheetsService: GoogleAppsScript.Sheets = Val.assert(
    Sheets,
    "Sheets (enable the Advanced Sheets Service)",
  );
  const requests = toUpdateRequests(sheetId, changes);
  for (let i = 0; i < requests.length; i += MAX_REQUESTS_PER_BATCH) {
    sheetsService.Spreadsheets.batchUpdate(
      { requests: requests.slice(i, i + MAX_REQUESTS_PER_BATCH) },
      ssId,
    );
  }
  return requests.length;
}

// One request per contiguous run of changed cells in a column.
function toUpdateRequests(sheetId: number, changes: CellChange[]): object[] {
  const sorted = [...changes].sort((a, b) => a.col - b.col || a.row - b.row);
  const requests: object[] = [];
  let run: CellChange[] = [];
  const flush = () => {
    const first = run[0];
    if (!first) return;
    requests.push({
      updateCells: {
        range: {
          sheetId,
          startRowIndex: first.row - 1,
          endRowIndex: first.row - 1 + run.length,
          startColumnIndex: first.col - 1,
          endColumnIndex: first.col,
        },
        rows: run.map((change) => ({
          values: [{ userEnteredValue: { stringValue: change.to } }],
        })),
        fields: "userEnteredValue",
      },
    });
    run = [];
  };
  for (const change of sorted) {
    const prev = run[run.length - 1];
    if (prev && prev.col === change.col && prev.row === change.row - 1) {
      run.push(change);
    } else {
      flush();
      run = [change];
    }
  }
  flush();
  return requests;
}

function tally(
  tallies: Map<number, ColumnTally>,
  col: number,
  sample: string,
): void {
  const existing = tallies.get(col) ?? { count: 0, samples: [] };
  existing.count += 1;
  if (existing.samples.length < 3) existing.samples.push(sample);
  tallies.set(col, existing);
}

function sortedEntries(
  tallies: Map<number, ColumnTally>,
): [number, ColumnTally][] {
  return [...tallies.entries()].sort((a, b) => a[0] - b[0]);
}

function headerAt(headers: unknown[], col: number): string {
  const header = String(headers[col - 1] ?? "").trim();
  return header ? `"${header}"` : "(no header)";
}

function pushCapped(list: string[], line: string): void {
  if (list.length < MAX_SAMPLES * 10) list.push(line);
}

function section(title: string, lines: string[]): string[] {
  if (lines.length === 0) return [];
  return [`\n${title} (${lines.length}):`, ...lines.map((line) => `  ${line}`)];
}

function a1(row: number, col: number): string {
  return `${a1Col(col)}${row}`;
}

function a1Col(col: number): string {
  let remaining = col;
  let name = "";
  while (remaining > 0) {
    const rest = (remaining - 1) % 26;
    name = String.fromCharCode(65 + rest) + name;
    remaining = Math.floor((remaining - 1) / 26);
  }
  return name;
}
