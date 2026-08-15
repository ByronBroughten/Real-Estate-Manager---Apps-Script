import { configGet } from "../00_base/spreadsheetConfig";
import { SpreadsheetRaw } from "../01_SpreadsheetRaw/SpreadsheetRaw";
import type { ColumnFullNameSimple } from "../02_generatedTraits/03_columnTraits";
import { SpreadsheetIndexed } from "../03_SpreadsheetIndexed/SpreadsheetIndexed";
import {
  SpreadsheetNamedBase,
  type SpreadsheetNamedProps,
} from "../04_SpreadsheetNamed/ClassBases/SpreadsheetNamedBase";
import { SpreadsheetNamed } from "../04_SpreadsheetNamed/SpreadsheetNamed";
import { Obj } from "../utils/Obj";

export type EventOrigin = {
  colIndex: number;
  rowIndex: number;
  sheetGid: number;
};

type EndpointsBase<CNF extends ColumnFullNameSimple> = Partial<
  Record<CNF, () => void>
>;
interface ApiProps<
  EP extends EndpointsBase<ColumnFullNameSimple>,
> extends SpreadsheetNamedProps {
  endpoints: EP;
}
type EndpointName<EP extends EndpointsBase<ColumnFullNameSimple>> = keyof EP &
  ColumnFullNameSimple;
export class Api<
  EP extends EndpointsBase<ColumnFullNameSimple>,
> extends SpreadsheetNamedBase {
  readonly endpoints: EP;
  constructor({ endpoints, ...rest }: ApiProps<EP>) {
    super(rest);
    this.endpoints = endpoints;
  }
  static init<EP extends EndpointsBase<ColumnFullNameSimple>>(
    endpoints: EP,
  ): Api<EP> {
    return new Api({
      endpoints,
      ...SpreadsheetNamedBase.initSpreadsheetNamedProps(),
    });
  }
  get endpointNames(): EndpointName<EP>[] {
    return Obj.keys(this.endpoints) as EndpointName<EP>[];
  }
  isApiEndpointName(
    columnFullName: ColumnFullNameSimple,
  ): columnFullName is EndpointName<EP> {
    return this.endpointNames.includes(columnFullName as EndpointName<EP>);
  }
  get ssr(): SpreadsheetRaw {
    return new SpreadsheetRaw(this.spreadsheetRawProps);
  }
  get ssi(): SpreadsheetIndexed {
    return new SpreadsheetIndexed(this.spreadsheetRawProps);
  }
  get ssn(): SpreadsheetNamed {
    return new SpreadsheetNamed(this.spreadsheetNamedProps);
  }
  static eventIndexToBase0(eventIndex: number): number {
    return eventIndex - 1;
  }
  static isSuspectedApiCall(e: GoogleAppsScript.Events.SheetsOnEdit): boolean {
    if (e.value !== "TRUE") {
      return false;
    } else if (
      Api.eventIndexToBase0(e.range.getRow()) !== configGet("actionRowIdxBase0")
    ) {
      return false;
    } else {
      return true;
    }
  }
  getEventOrigin(e: GoogleAppsScript.Events.SheetsOnEdit): EventOrigin {
    return {
      colIndex: Api.eventIndexToBase0(e.range.getColumn()),
      rowIndex: Api.eventIndexToBase0(e.range.getRow()),
      sheetGid: e.range.getSheet().getSheetId(),
    };
  }
  handleSheetOnEditEvent(e: GoogleAppsScript.Events.SheetsOnEdit): void {
    const { colIndex, rowIndex, sheetGid } = this.getEventOrigin(e);
    const { fullName } = this.ssi.schema.column(sheetGid, colIndex);
    if (this.isApiEndpointName(fullName)) {
      this.endpoints[fullName]();
    }
  }
}
