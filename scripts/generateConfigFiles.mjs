import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SHEET_CONFIGS_PATH = fileURLToPath(
  new URL("../src/01_generatedConfigs/sheetConfigs.ts", import.meta.url),
);
const COLUMN_CONFIGS_PATH = fileURLToPath(
  new URL("../src/01_generatedConfigs/columnConfigs.ts", import.meta.url),
);
const FUNCTION_NAME = "generateConfigFiles";
const CLASP_RUN_USER = "desktop-clasp-run";

class ConfigFilesGenerator {
  functionName = "generateConfigFiles";
  claspRunUser = "desktop-clasp-run";
  paths = {
    sheetConfigs: fileURLToPath(
      new URL("../src/01_generatedConfigs/sheetConfigs.ts", import.meta.url),
    ),
    columnConfigs: fileURLToPath(
      new URL("../src/01_generatedConfigs/columnConfigs.ts", import.meta.url),
    ),
  };
}

function runClaspFunction() {
  const { stdout, stderr, status, error } = spawnSync(
    "npx",
    ["clasp", "run", "--json", "-u", CLASP_RUN_USER, FUNCTION_NAME],
    { encoding: "utf8" },
  );
  if (error) {
    throw error;
  }
  if (status !== 0) {
    throw new Error(
      `clasp run exited with status ${status}.${stderr.trim() ? ` stderr: ${stderr.trim()}` : ""}`,
    );
  }
  if (!stdout.trim()) {
    throw new Error(
      `clasp run produced no output on stdout.${stderr.trim() ? ` stderr: ${stderr.trim()}` : ""}`,
    );
  }
  const { response, error: claspError } = JSON.parse(stdout);
  if (claspError) {
    throw new Error(`clasp run failed: ${JSON.stringify(claspError)}`);
  }
  if (typeof response !== "string") {
    throw new Error(
      `Expected a string response, got: ${JSON.stringify(response)}`,
    );
  }
  return response;
}

function parseSources(responseJson) {
  let parsed;
  try {
    parsed = JSON.parse(responseJson);
  } catch (err) {
    throw new Error(
      `generateConfigFiles's response wasn't valid JSON: ${err.message}`,
    );
  }
  const { sheetConfigs, columnConfigs } = parsed;
  if (typeof sheetConfigs !== "string" || typeof columnConfigs !== "string") {
    throw new Error(
      `generateConfigFiles's response is missing sheetConfigs/columnConfigs source strings: ${responseJson}`,
    );
  }
  return { sheetConfigs, columnConfigs };
}

function runTsc() {
  const { status } = spawnSync("npm", ["run", "tsc"], { stdio: "inherit" });
  return status === 0;
}

// Write nothing until both sources are confirmed good, so a failed/partial
// run never leaves sheetConfigs.ts and columnConfigs.ts out of sync with
// each other.
const { sheetConfigs, columnConfigs } = parseSources(runClaspFunction());
writeFileSync(SHEET_CONFIGS_PATH, sheetConfigs);
writeFileSync(COLUMN_CONFIGS_PATH, columnConfigs);
console.log(`Wrote ${SHEET_CONFIGS_PATH}`);
console.log(`Wrote ${COLUMN_CONFIGS_PATH}`);

console.log("Running npm run tsc to check the regenerated files...");
if (!runTsc()) {
  console.error(
    "\ngen:configs: regeneration succeeded and both files were written, " +
      "but `npm run tsc` failed above. This usually means a hand-written " +
      "file (e.g. SheetNameGroups.ts) still references a sheet/column name " +
      "that no longer exists after this regeneration. Fix those references " +
      "and re-run `npm run tsc` — do not hand-edit the generated files.",
  );
  process.exit(1);
}
console.log("gen:configs: tsc passed.");
