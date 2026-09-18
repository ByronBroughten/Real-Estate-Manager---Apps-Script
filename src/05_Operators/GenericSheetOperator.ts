import type { ColumnName } from "../01_generatedConfigs/columnConfigsTypes";
import type { SheetNameSimple } from "../01_generatedConfigs/sheetConfigsTypes";
import { SheetSchema } from "../02_SpreadsheetRaw/SpreadsheetSchema";
import { SheetNamedBase } from "../04_SpreadsheetNamed/ClassBases/SheetNamedBase";
import type { ColumnNamed } from "../04_SpreadsheetNamed/ColumnNamed";
import type { SheetNamed } from "../04_SpreadsheetNamed/SheetNamed";
import { SpreadsheetNamed } from "../04_SpreadsheetNamed/SpreadsheetNamed";
import type { ConfigSyncState, OperatorProps } from "./OperatorBase";

export interface SheetOperatorProps<
  SN extends SheetNameSimple,
> extends OperatorProps {
  sheetName: SN;
}

export class GenericSheetOperator<
  SN extends SheetNameSimple,
> extends SheetNamedBase<SN> {
  protected configSyncState: ConfigSyncState;
  constructor({ configSyncState, ...rest }: SheetOperatorProps<SN>) {
    super(rest);
    this.configSyncState = configSyncState;
  }
  get operatorProps(): OperatorProps {
    return {
      ...this.spreadsheetNamedProps,
      configSyncState: this.configSyncState,
    };
  }
  get ss(): SpreadsheetNamed {
    return new SpreadsheetNamed(this.spreadsheetNamedProps);
  }
  get sheet(): SheetNamed<SN> {
    return this.ss.sheet(this.sheetName);
  }
  get schema(): SheetSchema<SN> {
    return SheetSchema.fromSheetName(this.sheetName);
  }
  column<CN extends ColumnName<SN>>(columnName: CN): ColumnNamed<SN, CN> {
    return this.sheet.column(columnName);
  }
}
