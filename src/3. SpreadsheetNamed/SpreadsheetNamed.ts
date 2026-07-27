import type { TableName } from "../0. spreadsheetMetaData/4.0 tableAttributes.js";
import { SpreadsheetSchema } from "../1. SpreadsheetSchema/SpreadsheetSchema.js";
import type { BatchUpdateRequest } from "../2. AppsScriptRaw/ClassBases/SpreadsheetRawBase.js";
import { SpreadsheetRaw } from "../2. AppsScriptRaw/SpreadsheetRaw.js";
import { Obj } from "../utils/Obj.js";
import {
  SpreadsheetNamedBase,
  type SpreadsheetState,
} from "./ClassBases/SpreadsheetNamedBase.js";
import { SheetNamed, type SheetOptions } from "./SheetNamed.js";

export class SpreadsheetNamed extends SpreadsheetNamedBase {
  static init(): SpreadsheetNamed {
    return new SpreadsheetNamed({
      namedState: {
        spreadsheetTables: {} as SpreadsheetState,
        spreadsheetSchema: new SpreadsheetSchema(),
      },
      rawState: SpreadsheetRaw.initRawState(),
    });
  }
  private batchGet(tableNames: TableName[]) {
    // This defines which sheets you will need.
    // If you want to get fancy, you can make it define which columns you'll need
  }
  get raw(): SpreadsheetRaw {
    return new SpreadsheetRaw(this.spreadsheetRawProps);
  }
  get state(): SpreadsheetState {
    return this.spreadsheetTables;
  }
  get schema(): SpreadsheetSchema {
    return this.spreadsheetSchema;
  }

  get tableNames(): TableName[] {
    return Obj.keys(this.state);
  }
  sheet<TN extends TableName>(
    tableName: TN,
    options?: SheetOptions,
  ): SheetNamed<TN> {
    if (!this.tableNames.includes(tableName)) {
      return SheetNamed.init(tableName, this.spreadsheetProps, options);
    } else {
      return new SheetNamed({
        tableName,
        ...this.spreadsheetProps,
      });
    }
  }
  gatherRequestsAndBatchUpdate() {
    this.raw.batchUpdateByRequests(this.gatherRequests());
  }
  private gatherRequests(): BatchUpdateRequest[] {
    const requests: BatchUpdateRequest[] = [];
    for (const tableName of this.tableNames) {
      const sheet = this.sheet(tableName);
      requests.push(...sheet.collectRequests());
    }
    return requests;
  }
}
