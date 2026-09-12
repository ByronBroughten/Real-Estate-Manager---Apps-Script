import type {
  GetByDataFilterRequest,
  GoogleSpreadsheet,
  GoogleUpdateRequest,
} from "../00_base/AppsScriptTypes";

type BatchUpdateRequest =
  GoogleAppsScript.Sheets.Schema.BatchUpdateSpreadsheetRequest;
type BatchUpdateResponse =
  GoogleAppsScript.Sheets.Schema.BatchUpdateSpreadsheetResponse;

interface OptionalArgs {
  fields?: string;
}

const SHEETS_API_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

export interface SheetsHttpRequest {
  method: "GET" | "POST";
  url: string;
  body: string | null;
}

// The one seam below the framework: everything past it is HTTP.
export type SheetsHttpTransport = (request: SheetsHttpRequest) => unknown;

export interface SheetsServiceNodeProps {
  spreadsheetId: string;
  transport: SheetsHttpTransport;
  isDryRun: boolean;
  reportRequests: (requests: GoogleUpdateRequest[]) => void;
}

// The dry run is enforced here, the single door to Google, not at the caller.
export class SheetsServiceNode {
  private spreadsheetId: string;
  private transport: SheetsHttpTransport;
  private isDryRun: boolean;
  private reportRequests: (requests: GoogleUpdateRequest[]) => void;
  constructor(props: SheetsServiceNodeProps) {
    this.spreadsheetId = props.spreadsheetId;
    this.transport = props.transport;
    this.isDryRun = props.isDryRun;
    this.reportRequests = props.reportRequests;
  }
  static init(props: SheetsServiceNodeProps): SheetsServiceNode {
    return new SheetsServiceNode(props);
  }
  get Spreadsheets() {
    return {
      get: (spreadsheetId: string, optionalArgs?: OptionalArgs) =>
        this._get(spreadsheetId, optionalArgs),
      getByDataFilter: (
        resource: GetByDataFilterRequest,
        spreadsheetId: string,
        optionalArgs?: OptionalArgs,
      ) => this._getByDataFilter(resource, spreadsheetId, optionalArgs),
      batchUpdate: (resource: BatchUpdateRequest, spreadsheetId: string) =>
        this._batchUpdate(resource, spreadsheetId),
    };
  }
  private _get(
    spreadsheetId: string,
    optionalArgs?: OptionalArgs,
  ): GoogleSpreadsheet {
    return this._send<GoogleSpreadsheet>({
      method: "GET",
      url: this._url(spreadsheetId, "", optionalArgs),
      body: null,
    });
  }
  private _getByDataFilter(
    resource: GetByDataFilterRequest,
    spreadsheetId: string,
    optionalArgs?: OptionalArgs,
  ): GoogleSpreadsheet {
    return this._send<GoogleSpreadsheet>({
      method: "POST",
      url: this._url(spreadsheetId, ":getByDataFilter", optionalArgs),
      body: JSON.stringify(resource),
    });
  }
  private _batchUpdate(
    resource: BatchUpdateRequest,
    spreadsheetId: string,
  ): BatchUpdateResponse {
    this.reportRequests(resource.requests ?? []);
    if (this.isDryRun) {
      return {};
    }
    return this._send<BatchUpdateResponse>({
      method: "POST",
      url: this._url(spreadsheetId, ":batchUpdate"),
      body: JSON.stringify(resource),
    });
  }
  // The one place the wire is trusted, as Apps Script's own declaration trusts it.
  private _send<T>(request: SheetsHttpRequest): T {
    return this.transport(request) as T;
  }
  private _url(
    spreadsheetId: string,
    suffix: string,
    optionalArgs?: OptionalArgs,
  ): string {
    this._validateSpreadsheetId(spreadsheetId);
    const fields = optionalArgs?.fields;
    const query = fields ? `?fields=${encodeURIComponent(fields)}` : "";
    return `${SHEETS_API_BASE}/${spreadsheetId}${suffix}${query}`;
  }
  // Binds the adapter to one spreadsheet, so a hardcoded id can't reach another.
  private _validateSpreadsheetId(spreadsheetId: string): void {
    if (spreadsheetId === this.spreadsheetId) return;
    throw new Error(
      `The Node host is bound to spreadsheet "${this.spreadsheetId}" but was asked for "${spreadsheetId}".`,
    );
  }
}
