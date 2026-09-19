// Regenerates the four config files from the live config sheets, on the Node host.
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { startNodeHost } from "./nodeHost.mjs";

class ConfigFilesGenerator {
  path = {
    spreadsheetConfig: configsPath("spreadsheetConfig"),
    sheetConfigs: configsPath("sheetConfigs"),
    columnConfigs: configsPath("columnConfigs"),
    valueConfigs: configsPath("valueConfigs"),
  };
  static init() {
    return new ConfigFilesGenerator();
  }
  async run() {
    const {
      spreadsheetConfig,
      sheetConfigs,
      columnConfigs,
      valueConfigs,
      untypedColumnsSummary,
      floorReport,
    } = await this._generate();

    // Write nothing until all four are confirmed good; a subset would go stale.
    writeFileSync(this.path.spreadsheetConfig, spreadsheetConfig);
    writeFileSync(this.path.sheetConfigs, sheetConfigs);
    writeFileSync(this.path.columnConfigs, columnConfigs);
    writeFileSync(this.path.valueConfigs, valueConfigs);
    console.log(`Wrote ${this.path.spreadsheetConfig}`);
    console.log(`Wrote ${this.path.sheetConfigs}`);
    console.log(`Wrote ${this.path.columnConfigs}`);
    console.log(`Wrote ${this.path.valueConfigs}`);
    if (floorReport !== "") {
      console.log(`\ngen:configs: ${floorReport}`);
    }
    console.log(
      `\ngen:configs: ${untypedColumnsSummary ?? "every column is declared; no value name was guessed."}`,
    );

    console.log("\nRunning npm run tsc to check the regenerated files...");
    if (!this._runTsc()) {
      this._reportTscFailure();
      process.exit(1);
    }
    console.log("gen:configs: tsc passed.");
  }

  async _generate() {
    await startNodeHost({ isDryRun: false });
    const { ConfigOrchestrator } =
      await import("../src/05_Operators/ConfigOrchestrator.ts");
    return ConfigOrchestrator.init().generateConfigFiles();
  }

  _runTsc() {
    const { status } = spawnSync("npm", ["run", "tsc"], { stdio: "inherit" });
    return status === 0;
  }

  _reportTscFailure() {
    console.error(
      "\ngen:configs: regeneration succeeded and all four files were written, " +
        "but `npm run tsc` failed above. This usually means a hand-written " +
        "file (e.g. SheetNameGroups.ts) still references a sheet/column name " +
        "that no longer exists after this regeneration. Fix those references " +
        "and re-run `npm run tsc` — do not hand-edit the generated files.",
    );
  }
}

function configsPath(base) {
  return fileURLToPath(
    new URL(
      `../src/01_SpreadsheetSchema/generated/${base}.ts`,
      import.meta.url,
    ),
  );
}

await ConfigFilesGenerator.init().run();
