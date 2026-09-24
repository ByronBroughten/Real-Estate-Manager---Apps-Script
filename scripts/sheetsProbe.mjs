// `sheets-framework probe`: one read-only Sheets request, summarized; the full JSON goes to the package's .probe/last.json. See docs/how-it-runs.md, "Seeing the raw Sheets JSON".
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { SheetsTransport } from "./nodeHost.mjs";

const SHEETS_API_BASE = "https://sheets.googleapis.com/v4/spreadsheets";
const OUTPUT_NAME = ".probe/last.json";
const FLAGS = new Set(["--fields", "--filter", "--path"]);
const MAX_PRINTED_LINES = 60;
const MAX_LISTED = 50;

class SheetsProbe {
  constructor({ sheetsConfig, fields, filter, path }) {
    this.sheetsConfig = sheetsConfig;
    this.fields = fields;
    this.filter = filter;
    this.path = path;
    this.output = join(sheetsConfig.dir, OUTPUT_NAME);
    // Shown from where npm was invoked, so dev's file reads as dev/.probe/last.json from the root.
    this.outputShown = relative(
      process.env.INIT_CWD ?? process.cwd(),
      this.output,
    );
  }
  static init(argv, sheetsConfig) {
    const options = { sheetsConfig };
    for (let i = 0; i < argv.length; i += 2) {
      if (!FLAGS.has(argv[i]) || argv[i + 1] === undefined) {
        throw new Error(
          `Unexpected argument "${argv[i]}".\n\n${usage(OUTPUT_NAME)}`,
        );
      }
      options[argv[i].slice(2)] = argv[i + 1];
    }
    return new SheetsProbe(options);
  }
  run() {
    const isRequest = this.fields !== undefined || this.filter !== undefined;
    if (!isRequest && this.path === undefined) {
      console.log(usage(this.outputShown));
      return;
    }
    const response = isRequest ? this._fetch() : this._lastResponse();
    const value = valueAt(response, this.path);
    console.log(`\n${this.path ? `at ${this.path}` : "response"}:`);
    console.log(printed(value, this.outputShown));
  }
  _fetch() {
    const request = this._request();
    console.log(`probe: ${request.method} ${request.url}`);
    assertIsRead(request);
    const response = SheetsTransport.init().send(request);
    const json = JSON.stringify(response, null, 2);
    mkdirSync(join(this.sheetsConfig.dir, ".probe"), { recursive: true });
    writeFileSync(this.output, `${json}\n`);
    console.log(
      `saved: ${this.outputShown} (${json.split("\n").length} lines) — Read a line range of it when this summary is not enough.`,
    );
    return response;
  }
  // The only two requests this can build are reads; there is no way to name another verb.
  _request() {
    const base = `${SHEETS_API_BASE}/${this.sheetsConfig.spreadsheetId}`;
    const query = this.fields
      ? `?fields=${encodeURIComponent(this.fields)}`
      : "";
    if (this.filter === undefined) {
      return { method: "GET", url: `${base}${query}`, body: null };
    }
    return {
      method: "POST",
      url: `${base}:getByDataFilter${query}`,
      body: JSON.stringify(parsedFilter(this.filter)),
    };
  }
  _lastResponse() {
    try {
      return JSON.parse(readFileSync(this.output, "utf8"));
    } catch {
      throw new Error(
        `No saved response at ${this.outputShown}. Pass --fields or --filter to fetch one.`,
      );
    }
  }
}

const usage = (outputShown) => `Usage:
  npm run <app|dev>:probe -- --fields '<mask>' [--path <path>]         GET the spreadsheet with a fields mask
  npm run <app|dev>:probe -- --filter '<getByDataFilter body JSON>' [--fields '<mask>'] [--path <path>]
  npm run <app|dev>:probe -- --path <path>                             re-read ${outputShown}, no request

A path is dot-separated: an index, a key, or key=value to pick an array
element by that key or by properties.<key> — e.g. sheets.title=Occupancy.protectedRanges.
Only a summary is printed; the full response is saved to ${outputShown}.`;

// A backstop for future edits to _request: the transport itself has no dry-run gate.
function assertIsRead({ method, url }) {
  const isGet = method === "GET" && !/:\w+(\?|$)/.test(url.split("/").pop());
  const isFilterRead = method === "POST" && /:getByDataFilter(\?|$)/.test(url);
  if (!isGet && !isFilterRead) {
    throw new Error(`The probe only reads; refusing ${method} ${url}.`);
  }
}

function parsedFilter(filter) {
  let body;
  try {
    body = JSON.parse(filter);
  } catch (error) {
    throw new Error(`--filter is not JSON: ${error.message}`);
  }
  if (!Array.isArray(body?.dataFilters)) {
    throw new Error('--filter needs a "dataFilters" array.');
  }
  return body;
}

function valueAt(root, path) {
  if (!path) return root;
  let value = root;
  for (const segment of path.split(".")) {
    value = childAt(value, segment);
    if (value === undefined) {
      throw new Error(`Nothing at "${segment}" in path "${path}".`);
    }
  }
  return value;
}

function childAt(value, segment) {
  if (value === null || typeof value !== "object") return undefined;
  const match = /^([^=]+)=(.*)$/.exec(segment);
  if (!match || !Array.isArray(value)) return value[segment];
  const [, key, wanted] = match;
  return value.find(
    (each) => String(each?.[key] ?? each?.properties?.[key]) === wanted,
  );
}

// Small subtrees print whole; anything longer prints as a shape summary.
function printed(value, outputShown) {
  const json = JSON.stringify(value, null, 2) ?? "undefined";
  const lines = json.split("\n");
  if (lines.length <= MAX_PRINTED_LINES) return json;
  return `${shapeLines(value).join("\n")}\n\n(${lines.length} lines as JSON — narrow with --path, or Read ${outputShown} with offset/limit.)`;
}

function shapeLines(value) {
  if (Array.isArray(value)) return arrayLines(value);
  if (value === null || typeof value !== "object") return [shapeOf(value)];
  return Object.entries(value).flatMap(([key, child]) => [
    `  ${key}: ${shapeOf(child)}`,
    ...(Array.isArray(child) ? arrayLines(child).slice(1) : []),
  ]);
}

function arrayLines(array) {
  const lines = [shapeOf(array)];
  array.slice(0, MAX_LISTED).forEach((each, index) => {
    const label = labelOf(each);
    const counts = countsOf(each);
    if (label || counts) lines.push(`    ${index}: ${label}${counts}`);
  });
  if (array.length > MAX_LISTED) {
    lines.push(`    … ${array.length - MAX_LISTED} more`);
  }
  return lines;
}

function labelOf(value) {
  const source = value?.properties ?? value;
  if (source === null || typeof source !== "object") return "";
  const parts = ["sheetId", "title", "tableId", "name"]
    .filter((key) => source[key] !== undefined)
    .map((key) => `${key}=${JSON.stringify(source[key])}`);
  return parts.join(" ");
}

function countsOf(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return "";
  }
  const counts = Object.entries(value)
    .filter(([, child]) => Array.isArray(child))
    .map(([key, child]) => `${key}[${child.length}]`);
  return counts.length > 0 ? `  ${counts.join(" ")}` : "";
}

function shapeOf(value) {
  if (Array.isArray(value)) {
    const keys = new Set(
      value.flatMap((each) =>
        each && typeof each === "object" && !Array.isArray(each)
          ? Object.keys(each)
          : [],
      ),
    );
    return `array[${value.length}]${keys.size > 0 ? ` of {${[...keys].join(", ")}}` : ""}`;
  }
  if (value !== null && typeof value === "object") {
    return `object {${Object.keys(value).join(", ")}}`;
  }
  const json = JSON.stringify(value);
  return json.length > 60 ? `${json.slice(0, 57)}…` : json;
}

export function runProbe(argv, sheetsConfig) {
  SheetsProbe.init(argv, sheetsConfig).run();
}
