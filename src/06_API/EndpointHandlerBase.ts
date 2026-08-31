import type { ColumnName } from "../01_generatedConfigs/columnConfigsTypes";
import type { SheetNameSimple } from "../01_generatedConfigs/sheetConfigsTypes";
import {
  SpreadsheetNamedBase,
  type SpreadsheetNamedProps,
} from "../04_SpreadsheetNamed/ClassBases/SpreadsheetNamedBase";

export interface EndpointColumnNames<SN extends SheetNameSimple> {
  endpointName: ColumnName<SN>; // boolean action row
  lastRanName?: ColumnName<SN>; // date
  lastRunSucceededName?: ColumnName<SN>; // boolean
  selectorName?: ColumnName<SN>; // boolean
}

interface EndpointHandlerProps<
  SN extends SheetNameSimple,
> extends SpreadsheetNamedProps {
  sheetName: SN;
  columnNames: EndpointColumnNames<SN>;
}

export class EndpointHandlerBase<
  SN extends SheetNameSimple,
> extends SpreadsheetNamedBase {
  readonly sheetName: SN;
  readonly columnNames: EndpointColumnNames<SN>;
  constructor({ sheetName, columnNames, ...props }: EndpointHandlerProps<SN>) {
    super(props);
    this.sheetName = sheetName;
    this.columnNames = columnNames;
  }
}
