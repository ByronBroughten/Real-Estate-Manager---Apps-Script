// `sheets-framework chore`: runs one chore against the package's spreadsheet. See docs/how-it-runs.md, "The chore and its dry run".
import { fileURLToPath, pathToFileURL } from "node:url";
import { ChoreIndex } from "./choreIndex.mjs";
import { loadPackageConfigs, startNodeHost } from "./nodeHost.mjs";

const GENERIC_HOME = fileURLToPath(new URL("../src/chores/", import.meta.url));

class ChoreRunner {
  constructor({ sheetsConfig, index, choreName, isSend, isJson }) {
    this.sheetsConfig = sheetsConfig;
    this.index = index;
    this.choreName = choreName;
    this.isSend = isSend;
    this.isJson = isJson;
  }
  static init(sheetsConfig, argv) {
    return new ChoreRunner({
      sheetsConfig,
      index: ChoreIndex.init({
        genericHome: GENERIC_HOME,
        packageHomes: sheetsConfig.choreHomes,
      }),
      choreName: argv.find((arg) => !arg.startsWith("--")),
      isSend: argv.includes("--send"),
      isJson: argv.includes("--json"),
    });
  }
  async run() {
    if (!this.choreName) {
      console.log(
        "Usage: npm run <app|dev>:chore <name> [-- --send] [-- --json]",
      );
      console.log("  no flag   preview what it would write, writing nothing");
      console.log("  --send    apply it to the live spreadsheet");
      console.log("  --json    preview as raw request JSON\n");
      console.log(this.index.listing(this.sheetsConfig.dir));
      return;
    }
    // Resolved before the host starts, so a typo costs no setup.
    const modulePath = this._choreModulePath();
    const host = await startNodeHost({
      isDryRun: !this.isSend,
      sheetsConfig: this.sheetsConfig,
      configs: await loadPackageConfigs(this.sheetsConfig),
    });
    const chore = await this._loadChore(modulePath);
    console.log(`chore: ${this.choreName} — ${chore.description}\n`);
    const { SpreadsheetNamed } =
      await import("../src/04_SpreadsheetNamed/SpreadsheetNamed.ts");
    const result = chore.action(SpreadsheetNamed.init(), {
      spreadsheetId: host.spreadsheetId,
    });
    if (result) console.log(`result: ${result}`);
    this._report(host);
  }
  _report({ summary }) {
    if (summary.isEmpty) {
      console.log("\nThis chore wrote nothing.");
      return;
    }
    const heading = this.isSend
      ? "SENT — the spreadsheet was written to:"
      : "DRY RUN — nothing was written. It would send:";
    console.log(`\n${heading}\n`);
    console.log(this.isJson ? summary.json : summary.lines.join("\n"));
    console.log(
      `\n${summary.count} request(s).` +
        (this.isSend ? "" : " Re-run with `-- --send` to apply."),
    );
  }
  async _loadChore(modulePath) {
    const chore = (await import(modulePath))[this.choreName];
    if (!chore) {
      throw new Error(
        `${modulePath} exports no "${this.choreName}". A chore file exports one const named after the file.`,
      );
    }
    return chore;
  }
  _choreModulePath() {
    const path = this.index.pathOf(this.choreName);
    if (!path) {
      throw new Error(
        `No chore named "${this.choreName}".\n\n${this.index.listing(this.sheetsConfig.dir)}`,
      );
    }
    return pathToFileURL(path).href;
  }
}

export async function runChore(sheetsConfig, argv) {
  await ChoreRunner.init(sheetsConfig, argv).run();
}
