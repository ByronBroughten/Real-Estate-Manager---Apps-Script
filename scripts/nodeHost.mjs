// Starts the framework's second host. See docs/how-it-runs.md.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const CLASP_RUN_USER = "desktop-clasp-run";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const MAX_RESPONSE_BYTES = 256 * 1024 * 1024;

const CONFIG_FILES = [
  "spreadsheetConfig",
  "sheetConfigs",
  "columnConfigs",
  "valueConfigs",
];

const path = {
  fetchSync: fileURLToPath(new URL("./fetchSync.mjs", import.meta.url)),
  claspRc: fileURLToPath(new URL(".clasprc.json", `file://${homedir()}/`)),
};

export class SheetsTransport {
  accessToken = null;
  static init() {
    return new SheetsTransport();
  }
  send(request) {
    const { status, body } = this._fetchSync({
      url: request.url,
      method: request.method,
      headers: {
        Authorization: `Bearer ${this._ensureAccessToken()}`,
        "Content-Type": "application/json",
      },
      body: request.body,
    });
    if (status < 200 || status >= 300) {
      throw new Error(
        `Sheets API ${status} for ${request.method} ${request.url}\n${body}`,
      );
    }
    return JSON.parse(body);
  }
  _ensureAccessToken() {
    if (this.accessToken) return this.accessToken;
    const { client_id, client_secret, refresh_token } = this._claspCredential();
    const { status, body } = this._fetchSync({
      url: TOKEN_URL,
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id,
        client_secret,
        refresh_token,
        grant_type: "refresh_token",
      }).toString(),
    });
    const accessToken = status === 200 ? this._accessTokenOf(body) : null;
    if (!accessToken) {
      throw new Error(
        `Could not refresh the "${CLASP_RUN_USER}" token (HTTP ${status}). ` +
          `Run sheets-framework setup-auth to re-mint it.\n${body}`,
      );
    }
    this.accessToken = accessToken;
    return accessToken;
  }
  // A failing token endpoint need not answer in JSON, so a parse error is one too.
  _accessTokenOf(body) {
    try {
      return JSON.parse(body).access_token ?? null;
    } catch {
      return null;
    }
  }
  _claspCredential() {
    let tokens;
    try {
      ({ tokens } = JSON.parse(readFileSync(path.claspRc, "utf8")));
    } catch (error) {
      throw new Error(
        `Could not read ${path.claspRc}: ${error.message}. ` +
          "Run sheets-framework setup-auth.",
      );
    }
    const credential = tokens?.[CLASP_RUN_USER];
    if (!credential?.refresh_token) {
      throw new Error(
        `No "${CLASP_RUN_USER}" credential in ${path.claspRc}. ` +
          "Run sheets-framework setup-auth.",
      );
    }
    return credential;
  }
  _fetchSync(request) {
    const { status, stdout, stderr, error } = spawnSync(
      process.execPath,
      [path.fetchSync],
      {
        input: JSON.stringify(request),
        encoding: "utf8",
        maxBuffer: MAX_RESPONSE_BYTES,
      },
    );
    if (error) throw error;
    if (status !== 0) {
      throw new Error(
        `The request subprocess exited with ${status}.${stderr.trim() ? ` ${stderr.trim()}` : ""}`,
      );
    }
    return JSON.parse(stdout);
  }
}

export async function startNodeHost({ isDryRun, sheetsConfig, configs }) {
  const { NodeHost } = await import("../src/nodeHost/NodeHost.ts");
  const transport = SheetsTransport.init();
  return NodeHost.init({
    configs,
    spreadsheetId: sheetsConfig.spreadsheetId,
    transport: (request) => transport.send(request),
    isDryRun,
    log: (message) => console.log(`  log: ${message}`),
  }).ensureGlobals();
}

// The four files in the package's generatedDir, as the package's entry passes them to the framework.
export async function loadPackageConfigs({ generatedDir }) {
  const entries = await Promise.all(
    CONFIG_FILES.map(async (base) => {
      const url = pathToFileURL(join(generatedDir, `${base}.ts`));
      return [base, (await import(url.href))[base]];
    }),
  );
  return Object.fromEntries(entries);
}

export function hasPackageConfigs({ generatedDir }) {
  return CONFIG_FILES.every((base) =>
    existsSync(join(generatedDir, `${base}.ts`)),
  );
}

// The framework's own dev configs: enough to read any spreadsheet's config floor.
export async function loadFrameworkConfigs() {
  return (await import("../dev/devConfigs.ts")).devConfigs;
}
