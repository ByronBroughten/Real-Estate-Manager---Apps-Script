# Rules for `scripts/`

- **Node-specific code lives here**: `node:` imports, the file system, processes, HTTP. Host-neutral code goes in `src/`, where `tsc` and lint check it.
- **`nodeHost.mjs` and `fetchSync.mjs` are the Node half of the Node host**; `src/nodeHost/` is the typed half and touches no Node API.
