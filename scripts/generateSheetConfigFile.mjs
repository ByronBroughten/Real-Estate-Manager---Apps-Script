import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const OUTPUT_PATH = fileURLToPath(
  new URL("../src/01_generatedConfigs/sheetConfigs.ts", import.meta.url),
);
const FUNCTION_NAME = "generateSheetConfigFile";
// clasp's "default" login is used for push/deploy and needs different OAuth
// scopes than clasp run (which needs the script's own manifest scopes, via
// `clasp login --use-project-scopes`). The two logins overwrite each other
// under the same credential slot, so `clasp run` uses this separate named
// profile instead of clobbering the default one used for push/deploy.
const CLASP_RUN_USER = "desktop-clasp-run";

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

const source = runClaspFunction();
writeFileSync(OUTPUT_PATH, source);
console.log(`Wrote ${OUTPUT_PATH}`);
