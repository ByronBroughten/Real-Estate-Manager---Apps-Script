// Runs one chore against the live spreadsheet. See README, "The chore and its dry run".
import { existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { startNodeHost } from "./nodeHost.mjs";

const CHORES_URL = new URL("../src/chores/", import.meta.url);
const CHORE_HOMES = ["", "oneOff/"];

class ChoreRunner {
  constructor({ choreName, isSend, isJson }) {
    this.choreName = choreName;
    this.isSend = isSend;
    this.isJson = isJson;
  }
  static init(argv) {
    return new ChoreRunner({
      choreName: argv.find((arg) => !arg.startsWith("--")),
      isSend: argv.includes("--send"),
      isJson: argv.includes("--json"),
    });
  }
  async run() {
    if (!this.choreName) {
      console.log("Usage: npm run chore <name> [-- --send] [-- --json]");
      console.log("  no flag   preview what it would write, writing nothing");
      console.log("  --send    apply it to the live spreadsheet");
      console.log("  --json    preview as raw request JSON\n");
      console.log(`Chores:\n${this._availableChores()}`);
      return;
    }
    // Resolved before the host starts, so a typo costs no setup.
    const modulePath = this._choreModulePath();
    const host = await startNodeHost({ isDryRun: !this.isSend });
    const chore = await this._loadChore(modulePath);
    console.log(`chore: ${this.choreName} — ${chore.description}\n`);
    const { SpreadsheetNamed } =
      await import("../src/04_SpreadsheetNamed/SpreadsheetNamed.ts");
    const result = chore.action(SpreadsheetNamed.init());
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
    const homes = CHORE_HOMES.filter((home) =>
      existsSync(this._chorePath(home)),
    );
    if (homes.length === 0) {
      throw new Error(
        `No chore named "${this.choreName}".\n\nChores:\n${this._availableChores()}`,
      );
    }
    if (homes.length > 1) {
      throw new Error(
        `"${this.choreName}" exists in more than one chore home: ${homes
          .map((home) => `${home}${this.choreName}.ts`)
          .join(", ")}. Rename or delete one.`,
      );
    }
    return new URL(`${homes[0]}${this.choreName}.ts`, CHORES_URL).href;
  }
  _chorePath(home) {
    return fileURLToPath(new URL(`${home}${this.choreName}.ts`, CHORES_URL));
  }
  _availableChores() {
    return CHORE_HOMES.flatMap((area) =>
      readdirSync(fileURLToPath(new URL(area, CHORES_URL)))
        .filter((file) => file.endsWith(".ts") && file !== "Chore.ts")
        .map((file) => `  ${area}${file.replace(/\.ts$/, "")}`),
    ).join("\n");
  }
}

await ChoreRunner.init(process.argv.slice(2)).run();
