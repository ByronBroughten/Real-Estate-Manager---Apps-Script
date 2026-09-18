import {
  GoogleSheetsAPI,
  type OpaqueRawRequest,
  type SheetsHttpTransport,
} from "../00_base/GoogleSheetsAPI";
import { installRawSource } from "../00_base/RawSource";
import { UpdateRequestSummary } from "./UpdateRequestSummary";

const spreadsheetIdProperty = "realEstateSpreadsheetId";

export interface NodeHostProps {
  spreadsheetId: string;
  transport: SheetsHttpTransport;
  isDryRun: boolean;
  log: (message: string) => void;
}

// The framework's second host — Sheets only, in Node. See README, "How it runs".
export class NodeHost {
  readonly spreadsheetId: string;
  readonly isDryRun: boolean;
  private transport: SheetsHttpTransport;
  private log: (message: string) => void;
  private sentRequests: OpaqueRawRequest[];
  constructor(props: NodeHostProps) {
    this.spreadsheetId = props.spreadsheetId;
    this.isDryRun = props.isDryRun;
    this.transport = props.transport;
    this.log = props.log;
    this.sentRequests = [];
  }
  static init(props: NodeHostProps): NodeHost {
    return new NodeHost(props);
  }
  get googleSheetsAPI(): GoogleSheetsAPI {
    return GoogleSheetsAPI.initHttp({
      spreadsheetId: this.spreadsheetId,
      transport: this.transport,
      isDryRun: this.isDryRun,
      reportRequests: (requests) => this.sentRequests.push(...requests),
    });
  }
  // Every request the run produced, sent or withheld by the dry run.
  get summary(): UpdateRequestSummary {
    return new UpdateRequestSummary({ requests: this.sentRequests });
  }
  ensureGlobals(): this {
    const globals = globalThis as Record<string, unknown>;
    globals.PropertiesService = this._makePropertiesService();
    globals.Logger = { log: this.log };
    installRawSource(this.googleSheetsAPI);
    return this;
  }
  private _makePropertiesService() {
    const spreadsheetId = this.spreadsheetId;
    return {
      getScriptProperties: () => ({
        getProperty: (key: string): string | null =>
          key === spreadsheetIdProperty ? spreadsheetId : null,
      }),
    };
  }
}
