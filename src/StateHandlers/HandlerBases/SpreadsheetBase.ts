import type { SectionName } from "../../appSchema/2. attributes/sectionAttributes";
import type { SectionsSchema } from "../../appSchema/4. generated/sectionsSchema";
import type { SheetState } from "./SheetBase";

export type SpreadsheetState = {
  [SN in SectionName]: SheetState<SN>;
};

export interface SpreadsheetProps {
  spreadsheetState: SpreadsheetState;
  sectionsSchema: SectionsSchema;
  gss: GoogleAppsScript.Spreadsheet.Spreadsheet;
}

export class SpreadsheetBase {
  readonly spreadsheetState: SpreadsheetState;
  readonly sectionsSchema: SectionsSchema;
  readonly gss: GoogleAppsScript.Spreadsheet.Spreadsheet;
  constructor(props: SpreadsheetProps) {
    this.spreadsheetState = props.spreadsheetState;
    this.sectionsSchema = props.sectionsSchema;
    this.gss = props.gss;
  }
  get spreadsheetProps(): SpreadsheetProps {
    return {
      spreadsheetState: this.spreadsheetState,
      sectionsSchema: this.sectionsSchema,
      gss: this.gss,
    };
  }
  get headerRowIdxBase1(): number {
    return this.sectionsSchema.headerRowIdxBase1;
  }
  get topBodyRowIdxBase1(): number {
    return this.sectionsSchema.topBodyRowIdxBase1;
  }
}
