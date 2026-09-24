# How it runs

Map fragment routed from `AGENTS.md`. Read the heading the task needs.

**The framework runs in two hosts, and only one of them is production**: Apps Script, pushed with `clasp`, and the Node host behind the chore runner and `gen:configs`, which reaches Sheets and nothing else. Every live command names a target, `dev` or `app` ("Targets: dev and app"), and what needs a yes first is under "Before touching the live spreadsheet or deployment". Claude Code's hooks are [`docs/claude-code-guardrails.md`](./claude-code-guardrails.md).

## Apps Script is the production host

`src/` is TypeScript compiled by `rollup` (via `@rollup/plugin-typescript`, configured by "The rollup preset" below) into a single `dist/bundle.js`, which `clasp` pushes to a Google Apps Script project. The code then executes server-side inside Apps Script. Spreadsheet I/O goes through `GoogleSheetsAPI`, which is the only module that calls the Sheets Advanced Service (`Spreadsheets.get`, `getByDataFilter`, `batchUpdate`), not the `SpreadsheetApp` UI-bound API. Entry points are the top-level functions in `src/index.ts` — `triggerOnEdit` and `triggerOnChange`, which Apps Script calls by name from installed triggers — each a one-liner handing its event and the app's configs (`src/appConfigs.ts`) and endpoints to `AppsScriptApi` (`src/appsScriptHost/`), the Apps Script host's trigger glue. It decodes the event into a platform-neutral `SheetEdit` or `SheetChange` and calls `Api`'s matching static handler, and shows any toast the change handler returns. Before any framework work, the handler installs the configs, which the tiers read through `Register`, and then the `GoogleSheetsAPI` adapter as the `RawSource` in Raw state. The edit handler installs only once the edit looks like an action-row checkbox, so an ordinary edit costs no property read. `GoogleSheetsAPI.forAppsScript()` binds the adapter to the spreadsheet named by the `realEstateSpreadsheetId` script property, and throws naming that property when it is missing. Node/DOM APIs are not available there — only in the local build tooling (`rollup`, `tsc`, `scripts/*.mjs`).

## The rollup preset

**`rollup.config.mjs` is `rollupPreset({ input })` from `scripts/rollupPreset.mjs`**, the future `./rollup` subpath, and returns a plain config an app can spread and override. It tree-shakes, so **only functions in the entry file are callable by name from Apps Script**: a function in any other module is dropped when nothing calls it, where the old `treeshake: false` bundle kept it by accident of flattening. The preset keeps every top-level function declaration in the entry file, exported or not, exporting it to rollup and stripping the `export` statement from the chunk. The `es` format's `export` is a syntax error in Apps Script. To opt out, pass `treeshake: false`: `rollupPreset({ input, treeshake: false })` keeps every module's code.

- **`rootDir` widens** (default `.`, resolved from cwd) with `filterRoot: false` and `declaration: false`, because the TypeScript plugin otherwise treats source outside its `rootDir` as external and silently leaves it out of the bundle. The app passes `packages/`, the directory above both packages.
- **An `UNRESOLVED_IMPORT` warning fails the build**, so a missing import can't ship as an external.
- **Rollup keeps an entry function's own name** when another module declares the same one, and renames the other; the strip throws if it ever sees a renamed entry export.

## The Node host

The Node host is the second one (the framework's `src/nodeHost/`, launched by its `scripts/nodeHost.mjs`). Spreadsheet I/O is six `RawSource` methods — fetch sheet properties, fetch the time zone, fetch grid ranges, fetch conditional format rules, fetch edit protections, apply the queued write list — none of which names a spreadsheet: the adapter is bound to one when it is constructed. `GoogleSheetsAPI` maps those onto the three Advanced Service verbs and, in Node, an HTTP transport. `NodeHost.ensureGlobals()` installs a `Logger` onto the global scope, installs configs as the Apps Script entry call does, and injects `GoogleSheetsAPI`, bound to the configured spreadsheet ID, as the `RawSource`, before any framework module loads. There is no `PropertiesService` stub. It does **not** install a `Sheets` global, so a chore that reaches for `Sheets` or `SpreadsheetApp` still fails by name. Two commands use it: `npm run <app|dev>:chore <name>` and `npm run <app|dev>:gen:configs`. A chore gets the four files in its package's `generatedDir`, passed to the same `installConfigs` the entry call uses, so `dev:chore` runs on the framework's `dev/generated/`. `gen:configs` installs the package's own configs too, or the framework's dev ones when the package has none yet, since it reads only the config floor, which every package shares.

## The Node host reaches Sheets and nothing else

**The Node host reaches Sheets and nothing else.** Triggers, Gmail and Docs run in Apps Script and stay there — a deliberate boundary, not a gap waiting to be filled. `ScriptApp` and `SpreadsheetApp` are deliberately left uninstalled, so a chore that reaches for one fails by name rather than half-working. And the adapter's fidelity to the real Advanced Sheets Service is an assumption rather than a fact: it is exercised against a recorded payload, not against Google. Moving `gen:configs` off `clasp run` also removed the last routine exercise of the deployed bundle, leaving the live trigger as the only thing that runs it — an accepted cost, taken because one regeneration path beats two, but worth remembering if a deployment-only failure ever appears.

## Node-host transport: one HTTPS call per request

**Each Node-host request is one HTTPS call to the Sheets REST API**, authenticated with the `desktop-clasp-run` credential clasp already stores. The framework's Sheets calls are synchronous and use their return values immediately, so the transport has to block: the framework's `scripts/nodeHost.mjs` `spawnSync`s `scripts/fetchSync.mjs`, a one-request-per-process script that reads the request from stdin and writes the response to stdout. TypeScript is run by `tsx`, because the repo's relative imports are extensionless under `bundler` module resolution and Node's own type stripping cannot resolve them.

## The sheets-framework bin

**The framework's `scripts/sheets-framework.mjs` is the one tooling entry**, installed as the `sheets-framework` bin: a `.mjs` shim that registers `tsx`, then runs `gen-configs`, `chore`, `probe` or `setup-auth`. The first three read the nearest `sheets.config.json` above cwd, the way clasp finds `.clasp.json`, and take the spreadsheet ID from it and nowhere else: no flag, no env override (`scripts/sheetsConfig.mjs`). The file is checked in and data-only:

- `spreadsheetId`: the package's spreadsheet.
- `generatedDir`: where `gen-configs` writes the four config files and where the chore runner loads them from.
- `choreHomes`: the package's own chore folders. The framework's generic chores (`src/chores/`) are listed in every package, and a package chore with a generic chore's name stops the run (`scripts/choreIndex.mjs`).

Paths are relative to the config file, which sits at each package's root: the app's has `src/generated` with `src/chores` and `src/chores/oneOff`, the framework's (the dev spreadsheet) `dev/generated` with `dev/chores`. **The bin refuses to run when two `sheets.config.json` files in the repo share a spreadsheet ID**, so a copy-paste mistake can't merge the two targets. `gen-configs` checks its output with the package's own `npm run tsc`.

## Targets: dev and app

**Every live command names its target through a root alias: `dev:*` for the `Sheets Framework Dev` spreadsheet, `app:*` for the real-estate one.** Each alias runs its package's own script with `-w <pkg> --` (`real-estate-app` for `app:*`, `@byronbroughten/sheets-framework` for `dev:*`), so npm runs the bin from that package and it finds that package's `sheets.config.json`. A bare `npx sheets-framework …` matches no allow rule, so it always asks.

The threat model is accidents, with tampering made visible. Both clasp credentials cover the whole Google account, so OAuth can't isolate the two spreadsheets; the permission rules and hooks do.

| Command | dev | app |
| --- | --- | --- |
| `probe`, `chore <name>` (dry run) | allow | allow |
| `chore <name> -- --send` | allow | ask, and the yes must name the chore |
| `gen:configs` | allow | allow, under the four conditions below |
| `push` / `run <fn>` / `build` | allow | ask |
| `clasp deploy`, bare `clasp *` | ask | ask |
| gsheets `update_cells`, `batch_update_cells`, `create_sheet` | allow | ask, with the exact sheet, range and values |
| gsheets `create_spreadsheet`, `share_spreadsheet` | ask | ask |
| gsheets reads | allow | allow |

- **Bare `npx sheets-framework …`, `node packages/framework/scripts/sheets-framework.mjs …`, a package-level `npm run chore …` and `npm run … -w …` match no rule, so they ask.** The only `--send` ask rule is `npm run app:chore * --send*`.
- **A dev write's standing yes holds only while the pinning files are clean**, and a gsheets write gets it only on the dev ID. The hook: `pinnedTargetGuard.mjs` in [`docs/claude-code-guardrails.md`](./claude-code-guardrails.md).
- **`dev:build`, `dev:push` and `dev:run` exit with an error until the dev Apps Script project lands** (slice L of #129).
- **The dev spreadsheet is not a rehearsal copy of the app one.** Sheet configs key every sheet by its GID, and the dev sheet carries its own fixture sheets, not a copy of the business ones.
- **The dev fixture is built in three steps**: `dev:gen:configs` (creates the config floor), `dev:chore buildDevFixtures -- --send` (creates any missing fixture tab and sets the config ticks, and refuses any other spreadsheet ID), then `dev:gen:configs` again, which writes the framework's checked-in `dev/generated/`. The chore leaves an existing tab alone, so to rebuild a drifted one, delete the tab and run the three again.

## Before touching the live spreadsheet or deployment

**Never run these against the app target without asking the user first** — they change the live Apps Script deployment or write to the user's real Google Sheet. A yes for the dev spreadsheet never covers the app one. Reading either sheet needs no yes:

- `npm run app:build` (runs `clasp push`)
- `clasp push`, `clasp run <anything>`, `clasp deploy` (deploy asks on both targets)
- `npm run app:chore <name> -- --send`, which applies a chore to the live spreadsheet. The yes has to name that chore; a general go-ahead is not one.

`npm run tsc` (type-checking only) is always safe to run freely, and so is `npm run app:chore <name>` without `--send`, which cannot write (see "The chore and its dry run").

`npm run app:gen:configs` **writes** to the live Sheet Config/Column Config sheets and to business sheets' header rows (adding missing column IDs) before it regenerates the four local config files from live Spreadsheet Config plus the other config sheets (floor vs generated: [`docs/generated-data.md`](./generated-data.md)). It prints the floor report — a one-line summary of what the config-sheet floor created, overwrote or left behind — beside the untyped-columns summary and the declared-cell report, which names any self-describing row whose declared cell it wrote back to the floor seed, and it has **standing permission** under four conditions, all of which must hold. `dev:gen:configs` needs only the last two, since the dev spreadsheet holds no business data:

- no uncommitted changes in the framework's `src/01_SpreadsheetSchema/` or the app's `src/generated/`;
- no uncommitted changes in the framework's `src/05_Operators/`, because the command now executes local, possibly unreviewed operator code against the live config sheets;
- the agent reports what changed, the floor report, the declared-cell report, and the untyped-column count it returned;
- it is never a blind fix for a type error whose cause has not been identified. An identified identity or incidental retarget goes through [retarget-after-gen-configs](../.claude/skills/retarget-after-gen-configs/SKILL.md); an unidentified one still means no patch.

**A guard ships in the same commit as the write it guards, or earlier** ([`packages/framework/src/AGENTS.md`](../packages/framework/src/AGENTS.md)). A standing-permission `gen:configs` run can land between any two commits, so a write merged ahead of its refusal or fail-closed check writes unguarded.

## The chore and its dry run

A **chore** is a unit of work run from the terminal against the live spreadsheet, as against an endpoint, which an operator runs from the sheet by ticking a checkbox. One typed exported const per file, named after its file, in a generic or package chore home — see [Chores](./architecture/chores.md) for the homes.

```
npm run app:chore                      # list the chores
npm run app:chore <name>               # dry run: read the sheet, print what it would write
npm run app:chore <name> -- --json     # the same, as raw request JSON
npm run app:chore <name> -- --send     # apply it
npm run dev:chore <name> -- --send     # the same, on the dev spreadsheet
```

**Dry-run mode is enforced at the adapter, not at the runner and not at the chore's handle.** The adapter is the single door to Google in the Node host, so a dry run that records the requests and returns an empty response makes a *writing* dry run unrepresentable rather than discouraged — whoever calls the flush, the config orchestrator's internal one included. Reads are not gated: a dry run fetches from the live sheet normally, and only sends are suppressed. That is why narrowing a chore's spreadsheet handle to remove the flush would buy nothing and is not done.

The preview is a rendered summary, one line per request, naming the sheet, the range and what changes (`UpdateRequestSummary`). Each capability the framework grows owes the renderer a line format — an accepted recurring cost, because a preview nobody reads converts a decision into a formality. The compiler collects it: `ModeledRequestVerb` in `GoogleSheetsAPI.ts` lists the request kinds the builders may produce, and `UpdateRequestSummary` must format each one or `tsc` fails. `-- --json` is the escape hatch for when a line looks wrong. Because a dry run withholds every flush, a config regeneration that runs the floor then refetches still sees the live column types, so a generated-file preview can show the value-name churn that `--send` would prevent.

The agent verifies the preview before handing it over (the rule: [`src/chores/AGENTS.md`](../packages/framework/src/chores/AGENTS.md)), comparing the rendered requests against what the chore was meant to do and calling out anything wrong or larger than intended. That is a workflow obligation, not a code feature.

## When the Node host fails to authenticate

`gen:configs` and the chore runner both refresh the named credential `desktop-clasp-run` out of `~/.clasprc.json`. If one fails with an auth error, the token needs re-minting — run `npx sheets-framework setup-auth` from either package (it runs the framework's `scripts/setup-clasp-run-auth.sh`), which walks through it. The consent screen for GCP project `real-estate-manager-sheets` is deliberately published to production; left in "Testing" it would issue refresh tokens that expire every 7 days. Publishing alone doesn't fix an existing token, since one minted under "Testing" keeps its expiry — the re-authorization is the part that matters.

Google no longer lets you view or download a client secret after creating it, but you don't need to: clasp stores `client_id` and `client_secret` in `~/.clasprc.json`, and `--creds` reads only those two plus a localhost `redirect_uris` entry, so the file is always rebuildable. The script does that for you. Keep `~/.clasprc.json` at `chmod 600` — the refresh token in it no longer self-expires.

## Seeing the raw Sheets JSON

`GoogleSheetsAPI` maps the payload before anything can log it, and the `gsheets` MCP returns cell values only. To see what Google actually sent, use the committed probe:

```
npm run app:probe -- --fields 'sheets(properties(sheetId,title),protectedRanges)'
npm run app:probe -- --filter '{"dataFilters":[...]}' [--fields '<mask>']
npm run app:probe -- --path sheets.title=Occupancy.protectedRanges   # re-read the last response, no request
npm run dev:probe -- --fields 'properties(title,timeZone)'           # the same, on the dev spreadsheet
```

The bin's `probe` (`scripts/sheetsProbe.mjs`) sends one request through the Node host's `SheetsTransport`, authenticated like a chore. That request is a `GET` with a `fields` mask or a `:getByDataFilter`, and the script cannot build any other kind. It writes the full response, pretty-printed, to the gitignored `.probe/last.json` in its package: `.probe/last.json` for the app, `dev/.probe/last.json` for dev. Stdout gets only a summary: top-level keys, array counts, and each sheet's id and title. With `--path`, stdout gets that one subtree, printed whole when it is short and summarized when it is not. Never print a full body into the chat (the rule: root [`AGENTS.md`](../AGENTS.md)). When the summary isn't enough, `Read` a line range of the file it names. The throwaway `scripts/*.tmp.mjs` route this replaced is retired.

## The `gsheets` MCP tools

This project also has a `gsheets` MCP server available, which can read and write the user's real Google Sheet directly — separately from `clasp`/Apps Script.

- **Read-only tools are always fine to use freely**: `list_spreadsheets`, `list_sheets`, `get_sheet_data`. Take `spreadsheet_id` from the package's `sheets.config.json`.
- **They return cell values only, so they cannot see a table's declared column types.** `tables[].columnProperties` — a column's `columnType`, its table-column name, its validation rule — is invisible to `get_sheet_data`, and `include_grid_data` reaches cell formats but not tables. Reading those means calling the Sheets REST API with the `clasp` credential, and `app:probe`/`dev:probe` (above) is how to do it. It is read-only and on the allow-list, like a chore dry run. Ask before running any other script that opens that credential (the rule: root [`AGENTS.md`](../AGENTS.md)). The chore runner and `gen:configs` are exempt, because they open it as a routine step and the permissions above cover them.
- **`update_cells`, `batch_update_cells` and `create_sheet` on the dev spreadsheet have a standing yes**, granted by `pinnedTargetGuard.mjs` while the pinning files are clean.
- **Any other write — those three on any other spreadsheet, and `create_spreadsheet` everywhere — requires stating a specific plan and getting explicit permission before calling it.** "Can I edit the sheet?" is not enough; state the exact sheet, range, and values (or the exact new sheet/spreadsheet being created) and wait for a yes.
- **`share_spreadsheet` needs its own, separate confirmation** — it grants a third party access, not just data. State exactly who it's being shared with and at what permission level, and get explicit sign-off on that, distinct from any data-write approval.
