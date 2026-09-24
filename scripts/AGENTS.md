# Rules for `scripts/`

- **Node-specific code lives here**: `node:` imports, the file system, processes, HTTP. Host-neutral code goes in `src/`, where `tsc` and lint check it.
- **`nodeHost.mjs` and `fetchSync.mjs` are the Node half of the Node host**; `src/nodeHost/` is the typed half and touches no Node API.
- **`sheets-framework.mjs` is the only entry**: each spreadsheet subcommand is a module exporting a `run…` function that takes the loaded `sheets.config.json` first, and none reads a spreadsheet ID any other way. `setup-auth` touches no spreadsheet and only runs its shell script.
