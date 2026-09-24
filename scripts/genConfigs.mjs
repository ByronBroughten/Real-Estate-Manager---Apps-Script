// Regenerates the four config files from the live config sheets, on the Node host.
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { startNodeHost } from "./nodeHost.mjs";
import { takeTarget } from "./targets.mjs";

const DEFAULT_GENERATED_DIR = "src/01_SpreadsheetSchema/generated";

class ConfigFilesGenerator {
  constructor({ target }) {
    this.target = target;
    const generatedDir = target?.generatedDir ?? DEFAULT_GENERATED_DIR;
    this.path = {
      spreadsheetConfig: configsPath(generatedDir, "spreadsheetConfig"),
      sheetConfigs: configsPath(generatedDir, "sheetConfigs"),
      columnConfigs: configsPath(generatedDir, "columnConfigs"),
      valueConfigs: configsPath(generatedDir, "valueConfigs"),
    };
  }
  static init(argv) {
    return new ConfigFilesGenerator(takeTarget(argv));
  }
  async run() {
    const {
      spreadsheetConfig,
      sheetConfigs,
      columnConfigs,
      valueConfigs,
      untypedColumnsSummary,
      floorReport,
      idPrefixReport,
      declaredCellReport,
    } = await this._generate();

    // Write nothing until all four are confirmed good; a subset would go stale.
    mkdirSync(dirname(this.path.spreadsheetConfig), { recursive: true });
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
    if (idPrefixReport !== undefined) {
      console.log(`\ngen:configs: ${idPrefixReport}`);
    }
    if (declaredCellReport !== undefined) {
      console.log(`\ngen:configs: ${declaredCellReport}`);
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
    await startNodeHost({ isDryRun: false, target: this.target });
    const { ConfigCoordinator } =
      await import("../src/05_Operators/ConfigCoordinator.ts");
    return ConfigCoordinator.init().generateConfigFiles(
      this._makeConfigsImport(),
    );
  }

  _makeConfigsImport() {
    const makeConfigsPath = fileURLToPath(
      new URL("../src/01_SpreadsheetSchema/makeConfigs", import.meta.url),
    );
    return relative(dirname(this.path.spreadsheetConfig), makeConfigsPath);
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

function configsPath(generatedDir, base) {
  return fileURLToPath(
    new URL(`../${generatedDir}/${base}.ts`, import.meta.url),
  );
}

await ConfigFilesGenerator.init(process.argv.slice(2)).run();
