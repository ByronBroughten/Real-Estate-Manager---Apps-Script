import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

class ConfigFilesGenerator {
  functionName = "generateConfigFiles";
  claspRunUser = "desktop-clasp-run";
  path = {
    sheetConfigs: this.makeConfigsPath("sheetConfigs"),
    columnConfigs: this.makeConfigsPath("columnConfigs"),
    valueConfigs: this.makeConfigsPath("valueConfigs"),
  };
  makeConfigsPath(base) {
    return fileURLToPath(
      new URL(`../src/01_generatedConfigs/${base}.ts`, import.meta.url),
    );
  }
  static init() {
    return new ConfigFilesGenerator();
  }
  run() {
    const { sheetConfigs, columnConfigs, valueConfigs } = this._parseSources(
      this._runClaspFunction(),
    );

    // Write nothing until both sources are confirmed good, so a failed/partial
    // run never leaves sheetConfigs.ts and columnConfigs.ts out of sync with
    // each other.
    writeFileSync(this.path.sheetConfigs, sheetConfigs);
    writeFileSync(this.path.columnConfigs, columnConfigs);
    writeFileSync(this.path.valueConfigs, valueConfigs);
    console.log(`Wrote ${this.path.sheetConfigs}`);
    console.log(`Wrote ${this.path.columnConfigs}`);
    console.log(`Wrote ${this.path.valueConfigs}`);

    console.log("Running npm run tsc to check the regenerated files...");
    if (!this._runTsc()) {
      this._reportTscFailure();
      process.exit(1);
    }
    console.log("gen:configs: tsc passed.");
  }

  _runClaspFunction() {
    const { stdout, stderr, status, error } = spawnSync(
      "npx",
      ["clasp", "run", "--json", "-u", this.claspRunUser, this.functionName],
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

  _parseSources(responseJson) {
    let parsed;
    try {
      parsed = JSON.parse(responseJson);
    } catch (err) {
      throw new Error(
        `generateConfigFiles's response wasn't valid JSON: ${err.message}`,
      );
    }
    const { sheetConfigs, columnConfigs, valueConfigs } = parsed;
    if (
      typeof sheetConfigs !== "string" ||
      typeof columnConfigs !== "string" ||
      typeof valueConfigs !== "string"
    ) {
      throw new Error(
        `generateConfigFiles's response is missing sheetConfigs/columnConfigs/valueConfigs source strings: ${responseJson}`,
      );
    }
    return { sheetConfigs, columnConfigs, valueConfigs };
  }

  _runTsc() {
    const { status } = spawnSync("npm", ["run", "tsc"], { stdio: "inherit" });
    return status === 0;
  }

  _reportTscFailure() {
    console.error(
      "\ngen:configs: regeneration succeeded and both files were written, " +
        "but `npm run tsc` failed above. This usually means a hand-written " +
        "file (e.g. SheetNameGroups.ts) still references a sheet/column name " +
        "that no longer exists after this regeneration. Fix those references " +
        "and re-run `npm run tsc` — do not hand-edit the generated files.",
    );
  }
}

ConfigFilesGenerator.init().run();
