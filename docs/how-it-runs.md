# How it runs

Map fragment disclosed from `README.md`. Read the heading the task needs.

**The framework runs in two hosts, and only one of them is production.**

**Apps Script is the production host.** `src/` is TypeScript compiled by `rollup` (via `@rollup/plugin-typescript`) into a single `dist/bundle.js`, which `clasp` pushes to a Google Apps Script project. The code then executes server-side inside Apps Script against the Sheets Advanced Service (`Sheets.Spreadsheets...`), not the `SpreadsheetApp` UI-bound API. Its entry points are the top-level functions in `src/index.ts` — today just `triggerOnEdit`, which Apps Script calls by name from an installed trigger. Node/DOM APIs are not available there — only in the local build tooling (`rollup`, `tsc`, `scripts/*.mjs`).

**The Node host is the second one** (`src/nodeHost/`, launched by `scripts/nodeHost.mjs`). The framework's entire contact with Google is four calls — `Spreadsheets.get`, `Spreadsheets.getByDataFilter`, `Spreadsheets.batchUpdate`, and one script property holding the spreadsheet ID — so an adapter that impersonates those in Node is small. `NodeHost.ensureGlobals()` installs a `Sheets` object, a `PropertiesService` stub and a `Logger` onto the global scope before any framework module loads, and every tier from Raw upward then runs on your machine against the live spreadsheet with no push and no deployment involved. Nothing in the tiers changes to accommodate it. Two commands use it: `npm run chore <name>` and `npm run gen:configs`.

**The Node host reaches Sheets and nothing else.** Triggers, Gmail and Docs run in Apps Script and stay there — a deliberate boundary, not a gap waiting to be filled. `ScriptApp` and `SpreadsheetApp` are deliberately left uninstalled, so a chore that reaches for one fails by name rather than half-working. And the adapter's fidelity to the real Advanced Sheets Service is an assumption rather than a fact: it is exercised against a recorded payload, not against Google. Moving `gen:configs` off `clasp run` also removed the last routine exercise of the deployed bundle, leaving the live trigger as the only thing that runs it — an accepted cost, taken because one regeneration path beats two, but worth remembering if a deployment-only failure ever appears.

**Each Node-host request is one HTTPS call to the Sheets REST API**, authenticated with the `desktop-clasp-run` credential clasp already stores. The framework's Sheets calls are synchronous and use their return values immediately, so the transport has to block: `scripts/nodeHost.mjs` `spawnSync`s `scripts/fetchSync.mjs`, a one-request-per-process script that reads the request from stdin and writes the response to stdout. TypeScript is run by `tsx`, because the repo's relative imports are extensionless under `bundler` module resolution and Node's own type stripping cannot resolve them.

**Which spreadsheet the Node host points at comes from `nodeHost.config.json`**, an untracked file at the repo root holding `{ "spreadsheetId": "..." }`. Pointing it elsewhere therefore costs nothing to support, but it is **not** a rehearsal mechanism: sheet configs key every sheet by its GID, and whether a Drive copy preserves GIDs is unverified. The dry run below is the safety net, not a scratch spreadsheet.

## ⚠️ Before touching the live spreadsheet or deployment

**Never run these without asking the user first** — they affect a live Apps Script deployment and/or read the user's real Google Sheet:

- `npm run build` (runs `clasp push`)
- `clasp push`, `clasp run <anything>`, `clasp deploy`
- `npm run chore <name> -- --send`, which applies a chore to the live spreadsheet. The yes has to name that chore; a general go-ahead is not one.

`npm run tsc` (type-checking only) is always safe to run freely, and so is `npm run chore <name>` without `--send`, which cannot write (see "The chore and its dry run").

`npm run gen:configs` **writes** to the live Sheet Config/Column Config sheets and to business sheets' header rows (adding missing column IDs) before it regenerates the local files, and it has **standing permission** under four conditions, all of which must hold:

- no uncommitted changes in `src/01_generatedConfigs/`;
- no uncommitted changes in `src/05_Operators/`, because the command now executes local, possibly unreviewed operator code against the live config sheets;
- the agent reports what changed and the untyped-column count it returned;
- it is never a blind fix for a type error whose cause has not been identified.

### The chore and its dry run

A **chore** is a unit of work run from the terminal against the live spreadsheet, as against an endpoint, which an operator runs from the sheet by ticking a checkbox. One typed exported const per file, named after its file, under `src/chores/` — see [Chores](./architecture/chores.md) for the three homes.

```
npm run chore                      # list the chores
npm run chore <name>               # dry run: read the sheet, print what it would write
npm run chore <name> -- --json     # the same, as raw request JSON
npm run chore <name> -- --send     # apply it
```

**Dry-run mode is enforced at the adapter, not at the runner and not at the chore's handle.** The adapter is the single door to Google in the Node host, so a dry run that records the requests and returns an empty response makes a *writing* dry run unrepresentable rather than discouraged — whoever calls the flush, the config orchestrator's internal one included. Reads are not gated: a dry run fetches from the live sheet normally, and only sends are suppressed. That is why narrowing a chore's spreadsheet handle to remove the flush would buy nothing and is not done.

The preview is a rendered summary, one line per request, naming the sheet, the range and what changes (`UpdateRequestSummary`). Each capability the framework grows owes the renderer a line format — an accepted recurring cost, because a preview nobody reads converts a decision into a formality. `-- --json` is the escape hatch for when a line looks wrong.

**The agent verifies the preview before handing it over**, comparing the rendered requests against what the chore was meant to do and calling out anything wrong or larger than intended. That is a workflow obligation, not a code feature.

### When the Node host fails to authenticate

`npm run gen:configs` and `npm run chore` both refresh the named credential `desktop-clasp-run` out of `~/.clasprc.json`. If one fails with an auth error, the token needs re-minting — run `scripts/setup-clasp-run-auth.sh`, which walks through it. The consent screen for GCP project `real-estate-manager-sheets` is deliberately published to production; left in "Testing" it would issue refresh tokens that expire every 7 days. Publishing alone doesn't fix an existing token, since one minted under "Testing" keeps its expiry — the re-authorization is the part that matters.

Google no longer lets you view or download a client secret after creating it, but you don't need to: clasp stores `client_id` and `client_secret` in `~/.clasprc.json`, and `--creds` reads only those two plus a localhost `redirect_uris` entry, so the file is always rebuildable. The script does that for you. Keep `~/.clasprc.json` at `chmod 600` — the refresh token in it no longer self-expires.

### The `gsheets` MCP tools

This project also has a `gsheets` MCP server available, which can read and write the user's real Google Sheet directly — separately from `clasp`/Apps Script.

- **Read-only tools are always fine to use freely**: `list_spreadsheets`, `list_sheets`, `get_sheet_data`.
- **They return cell values only, so they cannot see a table's declared column types.** `tables[].columnProperties` — a column's `columnType`, its table-column name, its validation rule — is invisible to `get_sheet_data`, and `include_grid_data` reaches cell formats but not tables. Reading those means calling the Sheets REST API directly with the `clasp` credential: read-only and safe, but it opens a local credentials file, so **ask before running an ad-hoc script that does it**. The chore runner and `gen:configs` are exempt from that rule — both open the same credential as a routine step, and both are covered by the permissions above.
- **Any tool that writes — `create_spreadsheet`, `create_sheet`, `update_cells`, `batch_update_cells` — requires stating a specific plan and getting explicit permission before calling it.** "Can I edit the sheet?" is not enough; state the exact sheet, range, and values (or the exact new sheet/spreadsheet being created) and wait for a yes.
- **`share_spreadsheet` needs its own, separate confirmation** — it grants a third party access, not just data. State exactly who it's being shared with and at what permission level, and get explicit sign-off on that, distinct from any data-write approval.
