import type {
  GoogleGridRange,
  GoogleUpdateRequest,
  UserEnteredValue,
} from "../00_base/AppsScriptTypes";
import { sheetConfigsIndexed } from "../01_generatedConfigs/sheetConfigsTypes";
import { Obj } from "../utils/Obj";

type RowData = GoogleAppsScript.Sheets.Schema.RowData;
type DimensionRange = GoogleAppsScript.Sheets.Schema.DimensionRange;

const MAX_SAMPLE_VALUES = 4;
const MAX_RAW_CHARS = 120;
const SUBJECT_WIDTH = 24;
const COUNT_WIDTH = 14;

type RequestVerb = keyof GoogleUpdateRequest;

export interface UpdateRequestSummaryProps {
  requests: GoogleUpdateRequest[];
}

// One line per request, so the preview is read rather than waved through.
export class UpdateRequestSummary {
  private requests: GoogleUpdateRequest[];
  constructor({ requests }: UpdateRequestSummaryProps) {
    this.requests = requests;
  }
  static init(requests: GoogleUpdateRequest[]): UpdateRequestSummary {
    return new UpdateRequestSummary({ requests });
  }
  get isEmpty(): boolean {
    return this.requests.length === 0;
  }
  get count(): number {
    return this.requests.length;
  }
  get json(): string {
    return JSON.stringify({ requests: this.requests }, null, 2);
  }
  get lines(): string[] {
    return this.requests.map((request) => this._line(request));
  }
  private _line(request: GoogleUpdateRequest): string {
    const verb = this._verb(request);
    if (verb === null) return "(empty request)";
    return [verb.padEnd(26), this._body(verb, request)].join(" ");
  }
  private _verb(request: GoogleUpdateRequest): RequestVerb | null {
    return Obj.keys(request)[0] ?? null;
  }
  // Every request kind the framework models owes this a line format.
  private _body(verb: RequestVerb, request: GoogleUpdateRequest): string {
    switch (verb) {
      case "updateCells":
        return this._updateCellsBody(request.updateCells);
      case "repeatCell":
        return this._repeatCellBody(request.repeatCell);
      case "appendCells":
        return this._appendCellsBody(request.appendCells);
      case "insertDimension":
        return this._dimensionBody(request.insertDimension?.range, "insert");
      case "deleteDimension":
        return this._dimensionBody(request.deleteDimension?.range, "delete");
      case "sortRange":
        return this._sortRangeBody(request.sortRange);
      default:
        return this._rawBody(request, verb);
    }
  }
  private _updateCellsBody(
    updateCells: GoogleAppsScript.Sheets.Schema.UpdateCellsRequest | undefined,
  ): string {
    return this._columns(
      this._rangeLabel(updateCells?.range),
      `${this._cellCount(updateCells?.rows)} cell(s)`,
      this._valuesLabel(updateCells?.rows),
      this._fieldsLabel(updateCells?.fields),
    );
  }
  private _repeatCellBody(
    repeatCell: GoogleAppsScript.Sheets.Schema.RepeatCellRequest | undefined,
  ): string {
    const range = repeatCell?.range;
    return this._columns(
      this._rangeLabel(range),
      `${this._rangeCellCount(range)} cell(s)`,
      this._valuesLabel([{ values: [repeatCell?.cell ?? {}] }]),
      this._fieldsLabel(repeatCell?.fields),
    );
  }
  private _appendCellsBody(
    appendCells: GoogleAppsScript.Sheets.Schema.AppendCellsRequest | undefined,
  ): string {
    return this._columns(
      this._sheetLabel(appendCells?.sheetId),
      `${appendCells?.rows?.length ?? 0} row(s)`,
      this._valuesLabel(appendCells?.rows),
      this._fieldsLabel(appendCells?.fields),
    );
  }
  private _dimensionBody(
    range: DimensionRange | undefined,
    verb: "insert" | "delete",
  ): string {
    const dimension = (range?.dimension ?? "ROWS").toLowerCase();
    const startIndex = range?.startIndex ?? 0;
    const endIndex = range?.endIndex ?? startIndex;
    const span = this._dimensionSpanLabel(dimension, startIndex, endIndex);
    return this._columns(
      `${this._sheetLabel(range?.sheetId)}!${span}`,
      `${verb} ${endIndex - startIndex} ${dimension}`,
      "",
      "",
    );
  }
  private _dimensionSpanLabel(
    dimension: string,
    startIndex: number,
    endIndex: number,
  ): string {
    if (dimension === "columns") {
      return `${colLetters(startIndex)}:${colLetters(endIndex - 1)}`;
    }
    return `${startIndex + 1}:${endIndex}`;
  }
  private _sortRangeBody(
    sortRange: GoogleAppsScript.Sheets.Schema.SortRangeRequest | undefined,
  ): string {
    const spec = sortRange?.sortSpecs?.[0];
    const column = colLetters(spec?.dimensionIndex ?? 0);
    const order = (spec?.sortOrder ?? "ASCENDING").toLowerCase();
    return this._columns(
      this._rangeLabel(sortRange?.range),
      `by column ${column} ${order}`,
      "",
      "",
    );
  }
  // The opening's own line format: no type layer to read it through.
  private _rawBody(request: GoogleUpdateRequest, verb: RequestVerb): string {
    const inner = request[verb];
    const json = JSON.stringify(inner ?? {});
    return this._columns(
      this._sheetLabel(this._sheetIdOf(inner)),
      "",
      json.length > MAX_RAW_CHARS ? `${json.slice(0, MAX_RAW_CHARS)}…` : json,
      "",
    );
  }
  // An absent bound really is open-ended, so it renders open rather than as one cell.
  private _columns(
    subject: string,
    count: string,
    values: string,
    fields: string,
  ): string {
    return [
      subject.padEnd(SUBJECT_WIDTH),
      count.padEnd(COUNT_WIDTH),
      values,
      fields,
    ]
      .join(" ")
      .trimEnd();
  }
  // An unmodelled request may still name a sheet, and usually does.
  private _sheetIdOf(inner: object | undefined): number | undefined {
    const sheetId = (inner as { sheetId?: unknown } | undefined)?.sheetId;
    return typeof sheetId === "number" ? sheetId : undefined;
  }
  private _rangeLabel(range: GoogleGridRange | undefined): string {
    if (!range) return "(no range)";
    const { startRowIndex = 0, endRowIndex, endColumnIndex } = range;
    const startCell = `${colLetters(range.startColumnIndex ?? 0)}${startRowIndex + 1}`;
    const endColumn =
      endColumnIndex === undefined ? "" : colLetters(endColumnIndex - 1);
    return `${this._sheetLabel(range.sheetId)}!${startCell}:${endColumn}${endRowIndex ?? ""}`;
  }
  private _sheetLabel(sheetGid: number | undefined): string {
    if (sheetGid === undefined) return "(no sheet)";
    return sheetConfigsIndexed.get(sheetGid)?.sheetName ?? `gid ${sheetGid}`;
  }
  private _rangeCellCount(range: GoogleGridRange | undefined): number {
    const {
      startRowIndex = 0,
      endRowIndex = 0,
      startColumnIndex = 0,
    } = range ?? {};
    const endColumnIndex = range?.endColumnIndex ?? startColumnIndex + 1;
    return (endRowIndex - startRowIndex) * (endColumnIndex - startColumnIndex);
  }
  private _cellCount(rows: RowData[] | undefined): number {
    return (rows ?? []).reduce(
      (count, row) => count + (row.values?.length ?? 0),
      0,
    );
  }
  private _valuesLabel(rows: RowData[] | undefined): string {
    const values = (rows ?? []).flatMap((row) =>
      (row.values ?? []).map((cell) => valueLabel(cell.userEnteredValue)),
    );
    if (values.length === 0) return "(no values)";
    const shown = values.slice(0, MAX_SAMPLE_VALUES).join(", ");
    return values.length > MAX_SAMPLE_VALUES ? `${shown}, …` : shown;
  }
  private _fieldsLabel(fields: string | undefined): string {
    return fields ? `[${fields}]` : "";
  }
}

function valueLabel(userEnteredValue: UserEnteredValue): string {
  if (!userEnteredValue) return "(no value)";
  const { stringValue, numberValue, boolValue, formulaValue } =
    userEnteredValue;
  if (stringValue !== undefined) return `"${stringValue}"`;
  if (numberValue !== undefined) return String(numberValue);
  if (boolValue !== undefined) return String(boolValue);
  if (formulaValue !== undefined) return formulaValue;
  return "(no value)";
}

function colLetters(colIndex: number): string {
  let remaining = colIndex + 1;
  let letters = "";
  while (remaining > 0) {
    const rest = (remaining - 1) % 26;
    letters = String.fromCharCode(65 + rest) + letters;
    remaining = Math.floor((remaining - 1) / 26);
  }
  return letters;
}
