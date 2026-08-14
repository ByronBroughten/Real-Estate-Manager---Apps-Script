import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const OUTPUT_PATH = fileURLToPath(
  new URL("../src/02_generatedTraits/02_sheetTraits.ts", import.meta.url),
);
const FUNCTION_NAME = "generateSheetTraitsFile";

function runClaspFunction() {
  const stdout = execFileSync(
    "npx",
    ["clasp", "run", "--json", FUNCTION_NAME],
    { encoding: "utf8" },
  );
  const { response, error } = JSON.parse(stdout);
  if (error) {
    throw new Error(`clasp run failed: ${JSON.stringify(error)}`);
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
