# How it runs

Map fragment routed from `AGENTS.md`. Read the heading the task needs.

**The framework runs in two hosts, and only one of them is production**: Apps Script, pushed with `clasp`, and the Node host behind `npm run chore` and `npm run gen:configs`, which reaches Sheets and nothing else. What needs a yes first is under "Before touching the live spreadsheet or deployment". Claude Code's hooks are [`docs/claude-code-guardrails.md`](./claude-code-guardrails.md).

## Apps Script is the production host

`src/` is TypeScript compiled by `rollup` (via `@rollup/plugin-typescript`) into a single `dist/bundle.js`, which `clasp` pushes to a Google Apps Script project. The code then executes server-side inside Apps Script. Spreadsheet I/O goes through `GoogleSheetsAPI`, which is the only module that calls the Sheets Advanced Service (`Spreadsheets.get`, `getByDataFilter`, `batchUpdate`), not the `SpreadsheetApp` UI-bound API. Entry points are the top-level functions in `src/index.ts` — `triggerOnEdit` and `triggerOnChange`, which Apps Script calls by name from installed triggers — each a one-liner handing its event and the app's configs (`src/appConfigs.ts`) and endpoints to `AppsScriptApi` (`src/appsScriptHost/`), the Apps Script host's trigger glue. It decodes the event into a platform-neutral `SheetEdit` or `SheetChange` and calls `Api`'s matching static handler, which installs the configs, which the tiers read through `Register`, and then that adapter as the `RawSource` in Raw state before any framework work; `AppsScriptApi` shows the toast the change handler returns. The edit handler installs only once the edit looks like an action-row checkbox, so an ordinary edit costs no property read. `GoogleSheetsAPI.forAppsScript()` binds the adapter to the spreadsheet named by the `realEstateSpreadsheetId` script property, and throws naming that property when it is missing. Node/DOM APIs are not available there — only in the local build tooling (`rollup`, `tsc`, `scripts/*.mjs`).

## The Node host

The Node host is the second one (`src/nodeHost/`, launched by `scripts/nodeHost.mjs`). Spreadsheet I/O is five `RawSource` methods — fetch sheet properties, fetch grid ranges, fetch conditional format rules, fetch edit protections, apply the queued write list — none of which names a spreadsheet: the adapter is bound to one when it is constructed. `GoogleSheetsAPI` maps those onto the three Advanced Service verbs and, in Node, an HTTP transport. `NodeHost.ensureGlobals()` installs a `Logger` onto the global scope, installs the app's configs (`src/appConfigs.ts`) as the Apps Script entry call does, and injects `GoogleSheetsAPI`, bound to the configured spreadsheet ID, as the `RawSource`, before any framework module loads. There is no `PropertiesService` stub. It does **not** install a `Sheets` global, so a chore that reaches for `Sheets` or `SpreadsheetApp` still fails by name. Two commands use it: `npm run chore <name>` and `npm run gen:configs`.

## The Node host reaches Sheets and nothing else

**The Node host reaches Sheets and nothing else.** Triggers, Gmail and Docs run in Apps Script and stay there — a deliberate boundary, not a gap waiting to be filled. `ScriptApp` and `SpreadsheetApp` are deliberately left uninstalled, so a chore that reaches for one fails by name rather than half-working. And the adapter's fidelity to the real Advanced Sheets Service is an assumption rather than a fact: it is exercised against a recorded payload, not against Google. Moving `gen:configs` off `clasp run` also removed the last routine exercise of the deployed bundle, leaving the live trigger as the only thing that runs it — an accepted cost, taken because one regeneration path beats two, but worth remembering if a deployment-only failure ever appears.

## Node-host transport: one HTTPS call per request

**Each Node-host request is one HTTPS call to the Sheets REST API**, authenticated with the `desktop-clasp-run` credential clasp already stores. The framework's Sheets calls are synchronous and use their return values immediately, so the transport has to block: `scripts/nodeHost.mjs` `spawnSync`s `scripts/fetchSync.mjs`, a one-request-per-process script that reads the request from stdin and writes the response to stdout. TypeScript is run by `tsx`, because the repo's relative imports are extensionless under `bundler` module resolution and Node's own type stripping cannot resolve them.

## Which spreadsheet the Node host points at

**Which spreadsheet the Node host points at comes from `nodeHost.config.json`**, an untracked file at the repo root holding `{ "spreadsheetId": "..." }`. Pointing it elsewhere therefore costs nothing to support, but it is **not** a rehearsal mechanism: sheet configs key every sheet by its GID, and whether a Drive copy preserves GIDs is unverified. The dry run below is the safety net, not a scratch spreadsheet.

## Before touching the live spreadsheet or deployment

**Never run these without asking the user first** — they change a live Apps Script deployment or write to the user's real Google Sheet. Reading the live sheet needs no yes:

- `npm run build` (runs `clasp push`)
- `clasp push`, `clasp run <anything>`, `clasp deploy`
- `npm run chore <name> -- --send`, which applies a chore to the live spreadsheet. The yes has to name that chore; a general go-ahead is not one.

`npm run tsc` (type-checking only) is always safe to run freely, and so is `npm run chore <name>` without `--send`, which cannot write (see "The chore and its dry run").

`npm run gen:configs` **writes** to the live Sheet Config/Column Config sheets and to business sheets' header rows (adding missing column IDs) before it regenerates the four local config files from live Spreadsheet Config plus the other config sheets (floor vs generated: [`docs/generated-data.md`](./generated-data.md)). It prints the floor report — a one-line summary of what the config-sheet floor created, overwrote or left behind — beside the untyped-columns summary and the declared-cell report, which names any self-describing row whose declared cell it wrote back to the floor seed, and it has **standing permission** under four conditions, all of which must hold:

- no uncommitted changes in `src/01_SpreadsheetSchema/`, the generated folder included;
- no uncommitted changes in `src/05_Operators/`, because the command now executes local, possibly unreviewed operator code against the live config sheets;
- the agent reports what changed, the floor report, the declared-cell report, and the untyped-column count it returned;
- it is never a blind fix for a type error whose cause has not been identified. An identified identity or incidental retarget goes through [retarget-after-gen-configs](../.claude/skills/retarget-after-gen-configs/SKILL.md); an unidentified one still means no patch.

**A guard ships in the same commit as the write it guards, or earlier** ([`src/AGENTS.md`](../src/AGENTS.md)). A standing-permission `gen:configs` run can land between any two commits, so a write merged ahead of its refusal or fail-closed check writes unguarded.

## The chore and its dry run

A **chore** is a unit of work run from the terminal against the live spreadsheet, as against an endpoint, which an operator runs from the sheet by ticking a checkbox. One typed exported const per file, named after its file, under `src/chores/` — see [Chores](./architecture/chores.md) for the three homes.

```
npm run chore                      # list the chores
npm run chore <name>               # dry run: read the sheet, print what it would write
npm run chore <name> -- --json     # the same, as raw request JSON
npm run chore <name> -- --send     # apply it
```

**Dry-run mode is enforced at the adapter, not at the runner and not at the chore's handle.** The adapter is the single door to Google in the Node host, so a dry run that records the requests and returns an empty response makes a *writing* dry run unrepresentable rather than discouraged — whoever calls the flush, the config orchestrator's internal one included. Reads are not gated: a dry run fetches from the live sheet normally, and only sends are suppressed. That is why narrowing a chore's spreadsheet handle to remove the flush would buy nothing and is not done.

The preview is a rendered summary, one line per request, naming the sheet, the range and what changes (`UpdateRequestSummary`). Each capability the framework grows owes the renderer a line format — an accepted recurring cost, because a preview nobody reads converts a decision into a formality. The compiler collects it: `ModeledRequestVerb` in `GoogleSheetsAPI.ts` lists the request kinds the builders may produce, and `UpdateRequestSummary` must format each one or `tsc` fails. `-- --json` is the escape hatch for when a line looks wrong. Because a dry run withholds every flush, a config regeneration that runs the floor then refetches still sees the live column types, so a generated-file preview can show the value-name churn that `--send` would prevent.

The agent verifies the preview before handing it over (the rule: [`src/chores/AGENTS.md`](../src/chores/AGENTS.md)), comparing the rendered requests against what the chore was meant to do and calling out anything wrong or larger than intended. That is a workflow obligation, not a code feature.

## When the Node host fails to authenticate

`npm run gen:configs` and `npm run chore` both refresh the named credential `desktop-clasp-run` out of `~/.clasprc.json`. If one fails with an auth error, the token needs re-minting — run `scripts/setup-clasp-run-auth.sh`, which walks through it. The consent screen for GCP project `real-estate-manager-sheets` is deliberately published to production; left in "Testing" it would issue refresh tokens that expire every 7 days. Publishing alone doesn't fix an existing token, since one minted under "Testing" keeps its expiry — the re-authorization is the part that matters.

Google no longer lets you view or download a client secret after creating it, but you don't need to: clasp stores `client_id` and `client_secret` in `~/.clasprc.json`, and `--creds` reads only those two plus a localhost `redirect_uris` entry, so the file is always rebuildable. The script does that for you. Keep `~/.clasprc.json` at `chmod 600` — the refresh token in it no longer self-expires.

## Seeing the raw Sheets JSON

`GoogleSheetsAPI` maps the payload before anything can log it, and the `gsheets` MCP returns cell values only. To see what Google actually sent, use the committed probe:

```
npm run probe -- --fields 'sheets(properties(sheetId,title),protectedRanges)'
npm run probe -- --filter '{"dataFilters":[...]}' [--fields '<mask>']
npm run probe -- --path sheets.title=Occupancy.protectedRanges   # re-read the last response, no request
```

`scripts/sheetsProbe.mjs` sends one request through the Node host's `SheetsTransport`, authenticated like a chore. That request is a `GET` with a `fields` mask or a `:getByDataFilter`, and the script cannot build any other kind. It writes the full response, pretty-printed, to the gitignored `.probe/last.json`. Stdout gets only a summary: top-level keys, array counts, and each sheet's id and title. With `--path`, stdout gets that one subtree, printed whole when it is short and summarized when it is not. Never print a full body into the chat (the rule: root [`AGENTS.md`](../AGENTS.md)). When the summary isn't enough, `Read` a line range of `.probe/last.json`. The throwaway `scripts/*.tmp.mjs` route this replaced is retired.

## The `gsheets` MCP tools

This project also has a `gsheets` MCP server available, which can read and write the user's real Google Sheet directly — separately from `clasp`/Apps Script.

- **Read-only tools are always fine to use freely**: `list_spreadsheets`, `list_sheets`, `get_sheet_data`. Take `spreadsheetId` from `nodeHost.config.json`.
- **They return cell values only, so they cannot see a table's declared column types.** `tables[].columnProperties` — a column's `columnType`, its table-column name, its validation rule — is invisible to `get_sheet_data`, and `include_grid_data` reaches cell formats but not tables. Reading those means calling the Sheets REST API with the `clasp` credential, and `npm run probe` (above) is how to do it. It is read-only and on the allow-list, like a chore dry run. Ask before running any other script that opens that credential (the rule: root [`AGENTS.md`](../AGENTS.md)). The chore runner and `gen:configs` are exempt, because they open it as a routine step and the permissions above cover them.
- **Any tool that writes — `create_spreadsheet`, `create_sheet`, `update_cells`, `batch_update_cells` — requires stating a specific plan and getting explicit permission before calling it.** "Can I edit the sheet?" is not enough; state the exact sheet, range, and values (or the exact new sheet/spreadsheet being created) and wait for a yes.
- **`share_spreadsheet` needs its own, separate confirmation** — it grants a third party access, not just data. State exactly who it's being shared with and at what permission level, and get explicit sign-off on that, distinct from any data-write approval.
