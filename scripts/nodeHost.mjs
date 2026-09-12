// Starts the framework's second host. See README, "How it runs".
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

const CLASP_RUN_USER = "desktop-clasp-run";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const MAX_RESPONSE_BYTES = 256 * 1024 * 1024;

const path = {
  config: fileURLToPath(new URL("../nodeHost.config.json", import.meta.url)),
  fetchSync: fileURLToPath(new URL("./fetchSync.mjs", import.meta.url)),
  claspRc: fileURLToPath(new URL(".clasprc.json", `file://${homedir()}/`)),
};

class SheetsTransport {
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
          `Run scripts/setup-clasp-run-auth.sh to re-mint it.\n${body}`,
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
          "Run scripts/setup-clasp-run-auth.sh.",
      );
    }
    const credential = tokens?.[CLASP_RUN_USER];
    if (!credential?.refresh_token) {
      throw new Error(
        `No "${CLASP_RUN_USER}" credential in ${path.claspRc}. ` +
          "Run scripts/setup-clasp-run-auth.sh.",
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

export function readSpreadsheetId() {
  let source;
  try {
    source = readFileSync(path.config, "utf8");
  } catch {
    throw new Error(
      `No Node host config at ${path.config}. Create it (it is untracked) with:\n` +
        `  { "spreadsheetId": "<the spreadsheet's id>" }`,
    );
  }
  const { spreadsheetId } = JSON.parse(source);
  if (typeof spreadsheetId !== "string" || spreadsheetId === "") {
    throw new Error(`${path.config} has no "spreadsheetId" string.`);
  }
  return spreadsheetId;
}

export async function startNodeHost({ isDryRun }) {
  const { NodeHost } = await import("../src/nodeHost/NodeHost.ts");
  const transport = SheetsTransport.init();
  return NodeHost.init({
    spreadsheetId: readSpreadsheetId(),
    transport: (request) => transport.send(request),
    isDryRun,
    log: (message) => console.log(`  log: ${message}`),
  }).ensureGlobals();
}
