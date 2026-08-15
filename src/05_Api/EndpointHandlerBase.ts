import type { SheetNameSimple } from "../02_generatedTraits/02_sheetTraitsTypes";
import type { ColumnName } from "../02_generatedTraits/03_columnTraits";
import {
  SpreadsheetNamedBase,
  type SpreadsheetNamedProps,
} from "../04_SpreadsheetNamed/ClassBases/SpreadsheetNamedBase";

// SheetName with ColumnNames, not full column names
interface EndpointHandlerProps<
  SN extends SheetNameSimple,
  EN extends ColumnName<SN>, // string (boolean action row)
  LRN extends ColumnName<SN>, // date
  LSN extends ColumnName<SN>, // boolean
  SLN extends ColumnName<SN>, // boolean
> extends SpreadsheetNamedProps {
  sheetName: SN;
  endpointName?: EN;
  lastRanName?: LRN;
  lastRunSucceededName?: LSN;
  selectorName?: SLN;
}

export class EndpointHandlerBase<
  SN extends SheetNameSimple,
  EN extends ColumnName<SN>,
  LRN extends ColumnName<SN>,
  LSN extends ColumnName<SN>,
  SLN extends ColumnName<SN>,
> extends SpreadsheetNamedBase {
  readonly endpointName: EN;
  readonly lastRanName?: LRN;
  readonly lastRunSucceededName?: LSN;
  readonly selectorName?: SLN;
  constructor({
    endpointName,
    lastRanName,
    lastRunSucceededName,
    selectorName,
    ...props
  }: EndpointHandlerProps<SN, EN, LRN, LSN, SLN>) {
    super(props);
    this.endpointName = endpointName;
    this.lastRanName = lastRanName;
    this.lastRunSucceededName = lastRunSucceededName;
    this.selectorName = selectorName;
  }
}
