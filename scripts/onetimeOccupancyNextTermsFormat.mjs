// One-time: marks Occupancy AI:AV grey where the value matches its latest-terms counterpart, cream where it differs.
import fs from "node:fs";
import os from "node:os";

const SPREADSHEET_ID = "1wzFBUFani9pOHAOla7nQObqDuTQU084HZotAPbQlcnQ";
const SHEET_ID = 1079739305;
const NEXT_START = 34;
const COLUMN_COUNT = 14;
const LATEST_OFFSET = 20;
const ROW_START = 4;
const ROW_END = 16;
const GREY = { red: 0.6, green: 0.6, blue: 0.6 };
const CREAM = { red: 1, green: 0.9490196, blue: 0.8 };

const a1 = (index) => {
  let name = "";
  let n = index + 1;
  while (n > 0) {
    const m = (n - 1) % 26;
    name = String.fromCharCode(65 + m) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
};

const accessToken = async () => {
  const { tokens } = JSON.parse(fs.readFileSync(`${os.homedir()}/.clasprc.json`, "utf8"));
  const { client_id, client_secret, refresh_token } = tokens["desktop-clasp-run"];
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id, client_secret, refresh_token, grant_type: "refresh_token" }),
  });
  const { access_token } = await res.json();
  if (!access_token) throw new Error("could not refresh the clasp token");
  return access_token;
};

const api = async (token, path, init) => {
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(json, null, 2));
  return json;
};

const buildRule = (columnIndex, operator, format) => ({
  ranges: [{
    sheetId: SHEET_ID,
    startRowIndex: ROW_START,
    endRowIndex: ROW_END,
    startColumnIndex: columnIndex,
    endColumnIndex: columnIndex + 1,
  }],
  booleanRule: {
    condition: {
      type: "CUSTOM_FORMULA",
      values: [{
        userEnteredValue:
          `=${a1(columnIndex)}${ROW_START + 1}${operator}$${a1(columnIndex - LATEST_OFFSET)}${ROW_START + 1}`,
      }],
    },
    format,
  },
});

const targetsBlock = (rule) =>
  (rule.ranges ?? []).some((r) =>
    r.startColumnIndex >= NEXT_START && r.endColumnIndex <= NEXT_START + COLUMN_COUNT);

const token = await accessToken();
const sheet = (await api(token, "?fields=sheets(properties(sheetId),conditionalFormats(ranges))"))
  .sheets.find((s) => s.properties.sheetId === SHEET_ID);
const existing = sheet.conditionalFormats ?? [];
const mine = existing.flatMap((rule, index) => (targetsBlock(rule) ? [index] : []));

const rules = Array.from({ length: COLUMN_COUNT }, (_, i) => NEXT_START + i).flatMap((columnIndex) => [
  buildRule(columnIndex, "=", { textFormat: { foregroundColorStyle: { rgbColor: GREY } } }),
  buildRule(columnIndex, "<>", { backgroundColorStyle: { rgbColor: CREAM } }),
]);

// Deletions run first and shift indexes, so they go descending.
const requests = [
  ...[...mine].reverse().map((index) => ({ deleteConditionalFormatRule: { index, sheetId: SHEET_ID } })),
  ...rules.map((rule, i) => ({
    addConditionalFormatRule: { index: existing.length - mine.length + i, rule },
  })),
];

for (const request of requests) {
  const [verb, body] = Object.entries(request)[0];
  if (verb === "deleteConditionalFormatRule") {
    console.log(`delete ${String(body.index).padStart(2)}`);
    continue;
  }
  const [range] = body.rule.ranges;
  const col = a1(range.startColumnIndex);
  const paint = body.rule.booleanRule.format.textFormat ? "grey text " : "cream bg  ";
  console.log(`add    ${String(body.index).padStart(2)}  ${col}${range.startRowIndex + 1}:${col}${range.endRowIndex}`.padEnd(24)
    + `${paint}  ${body.rule.booleanRule.condition.values[0].userEnteredValue}`);
}

if (!process.argv.includes("--send")) {
  console.log(`\n${mine.length} deletions, ${rules.length} rules. Dry run; pass --send to apply.`);
  process.exit(0);
}

await api(token, ":batchUpdate", { method: "POST", body: JSON.stringify({ requests }) });
console.log(`\nApplied ${mine.length} deletions and ${rules.length} rules.`);
