// Issues one read-only Sheets request and prints a summary; the full JSON goes to .probe/last.json. See docs/how-it-runs.md, "Seeing the raw Sheets JSON".
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { SheetsTransport, spreadsheetIdOf } from "./nodeHost.mjs";
import { takeTarget } from "./targets.mjs";

const SHEETS_API_BASE = "https://sheets.googleapis.com/v4/spreadsheets";
const PROBE_DIR = new URL("../.probe/", import.meta.url);
const OUTPUT = new URL("last.json", PROBE_DIR);
const OUTPUT_SHOWN = ".probe/last.json";
const FLAGS = new Set(["--fields", "--filter", "--path"]);
const MAX_PRINTED_LINES = 60;
const MAX_LISTED = 50;

class SheetsProbe {
  constructor({ target, fields, filter, path }) {
    this.target = target;
    this.fields = fields;
    this.filter = filter;
    this.path = path;
  }
  static init(argvWithTarget) {
    const { target, argv } = takeTarget(argvWithTarget);
    const options = { target };
    for (let i = 0; i < argv.length; i += 2) {
      if (!FLAGS.has(argv[i]) || argv[i + 1] === undefined) {
        throw new Error(`Unexpected argument "${argv[i]}".\n\n${USAGE}`);
      }
      options[argv[i].slice(2)] = argv[i + 1];
    }
    return new SheetsProbe(options);
  }
  run() {
    const isRequest = this.fields !== undefined || this.filter !== undefined;
    if (!isRequest && this.path === undefined) {
      console.log(USAGE);
      return;
    }
    const response = isRequest ? this._fetch() : this._lastResponse();
    const value = valueAt(response, this.path);
    console.log(`\n${this.path ? `at ${this.path}` : "response"}:`);
    console.log(printed(value));
  }
  _fetch() {
    const request = this._request();
    console.log(`probe: ${request.method} ${request.url}`);
    assertIsRead(request);
    const response = SheetsTransport.init().send(request);
    const json = JSON.stringify(response, null, 2);
    mkdirSync(fileURLToPath(PROBE_DIR), { recursive: true });
    writeFileSync(fileURLToPath(OUTPUT), `${json}\n`);
    console.log(
      `saved: ${OUTPUT_SHOWN} (${json.split("\n").length} lines) — Read a line range of it when this summary is not enough.`,
    );
    return response;
  }
  // The only two requests this can build are reads; there is no way to name another verb.
  _request() {
    const base = `${SHEETS_API_BASE}/${spreadsheetIdOf(this.target)}`;
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
      return JSON.parse(readFileSync(fileURLToPath(OUTPUT), "utf8"));
    } catch {
      throw new Error(
        `No saved response at ${OUTPUT_SHOWN}. Pass --fields or --filter to fetch one.`,
      );
    }
  }
}

const USAGE = `Usage:
  npm run <app|dev>:probe -- --fields '<mask>' [--path <path>]         GET the spreadsheet with a fields mask
  npm run <app|dev>:probe -- --filter '<getByDataFilter body JSON>' [--fields '<mask>'] [--path <path>]
  npm run <app|dev>:probe -- --path <path>                             re-read ${OUTPUT_SHOWN}, no request

A path is dot-separated: an index, a key, or key=value to pick an array
element by that key or by properties.<key> — e.g. sheets.title=Occupancy.protectedRanges.
Only a summary is printed; the full response is saved to ${OUTPUT_SHOWN}.`;

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
function printed(value) {
  const json = JSON.stringify(value, null, 2) ?? "undefined";
  const lines = json.split("\n");
  if (lines.length <= MAX_PRINTED_LINES) return json;
  return `${shapeLines(value).join("\n")}\n\n(${lines.length} lines as JSON — narrow with --path, or Read ${OUTPUT_SHOWN} with offset/limit.)`;
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

SheetsProbe.init(process.argv.slice(2)).run();
