import type { ColumnName } from "../01_generatedConfigs/columnConfigsTypes";
import type { SheetNameSimple } from "../01_generatedConfigs/sheetConfigsTypes";
import { SheetNamedBase } from "../04_SpreadsheetNamed/ClassBases/SheetNamedBase";
import type { ColumnNamed } from "../04_SpreadsheetNamed/ColumnNamed";
import type { DataSheetNamed } from "../04_SpreadsheetNamed/DataSheetNamed";
import type { SheetNamed } from "../04_SpreadsheetNamed/SheetNamed";
import { SpreadsheetNamed } from "../04_SpreadsheetNamed/SpreadsheetNamed";
import { SpreadsheetSchemaNamed } from "../04_SpreadsheetNamed/SpreadsheetSchemaNamed";

export class GenericSheetOperator<
  SN extends SheetNameSimple,
> extends SheetNamedBase<SN> {
  get ss(): SpreadsheetNamed {
    return new SpreadsheetNamed(this.spreadsheetNamedProps);
  }
  get sheet(): SheetNamed<SN> {
    return this.ss.sheet(this.sheetName);
  }
  get sheetData(): DataSheetNamed<SN> {
    return this.sheet.data;
  }
  column<CN extends ColumnName<SN>>(columnName: CN): ColumnNamed<SN, CN> {
    return this.sheet.column(columnName);
  }
  get schema(): SpreadsheetSchemaNamed {
    return new SpreadsheetSchemaNamed();
  }
}
