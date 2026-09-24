# Rules for the app's `src/`

- **This package is the real-estate app; before adding a file, ask "would this make sense in a different Sheets-backed app?"** Yes: `packages/framework`, generically named. No: here.
- **Import the framework only from `@byronbroughten/sheets-framework`, and `/testing` only in `*.test.ts` and the config setup file**; lint holds it. `appUtils/` keeps the app's own `Arr` and `Val`.
- `index.ts`: the Apps Script triggers, handing `appConfigs` and `businessEndpoints` to `Api`. `businessEndpoints/`: every endpoint ([its rules](./businessEndpoints/AGENTS.md)). `chores/`: this spreadsheet's one-off jobs ([its rules](./chores/AGENTS.md)).
- **Regenerate, never hand-edit, `generated/`** (`npm run app:gen:configs`, gated: [targets-and-gates](../../../docs/targets-and-gates.md#before-touching-the-live-spreadsheet-or-deployment)). Grep `columnConfigs.ts` for the sheet key and read that one object.
- **The words are [CONTEXT.md](../CONTEXT.md)'s**, after the framework's. Code shape: [docs/style.md](../../../docs/style.md).
