#!/usr/bin/env node
// The sheets-framework bin: registers tsx, then runs one subcommand against the package whose sheets.config.json sits above cwd. See docs/how-it-runs.md.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { register } from "tsx/esm/api";
import { loadSheetsConfig } from "./sheetsConfig.mjs";

register();

const USAGE = `Usage: sheets-framework <command> [args]
  gen-configs          regenerate the package's four config files from its config sheets
  chore [name] [--send] [--json]
                       dry-run a chore (or apply it with --send); no name lists them
  probe --fields|--filter|--path ...
                       one read-only Sheets request; no args prints its usage
  setup-auth           mint the Node host's clasp credential

The spreadsheet ID comes only from the nearest sheets.config.json above cwd.`;

const [command, ...argv] = process.argv.slice(2);

switch (command) {
  case "gen-configs": {
    const { runGenConfigs } = await import("./genConfigs.mjs");
    await runGenConfigs(loadSheetsConfig());
    break;
  }
  case "chore": {
    const { runChore } = await import("./chore.mjs");
    await runChore(argv, loadSheetsConfig());
    break;
  }
  case "probe": {
    const { runProbe } = await import("./sheetsProbe.mjs");
    runProbe(argv, loadSheetsConfig());
    break;
  }
  case "setup-auth": {
    const script = fileURLToPath(
      new URL("./setup-clasp-run-auth.sh", import.meta.url),
    );
    const { status } = spawnSync("bash", [script, ...argv], {
      stdio: "inherit",
    });
    process.exit(status ?? 1);
    break;
  }
  default:
    console.error(
      command ? `Unknown command "${command}".\n\n${USAGE}` : USAGE,
    );
    process.exit(1);
}
