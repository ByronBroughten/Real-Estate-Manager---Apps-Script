import type { SectionName } from "../../appSchema/1. attributes/sectionAttributes";
import type { SectionsSchema } from "../../appSchema/3. generated/sectionsSchema";
import type { Sheet } from "../Sheet";
import { Spreadsheet } from "../Spreadsheet";

export class OperatorBase {
  readonly ss: Spreadsheet;
  constructor(ss: Spreadsheet) {
    this.ss = ss;
  }
  get schema(): SectionsSchema {
    return this.ss.sectionsSchema;
  }
  sheet<SN extends SectionName>(sectionName: SN): Sheet<SN> {
    return this.ss.sheet(sectionName);
  }
  batchUpdateRanges(): void {
    return this.ss.batchUpdateRanges();
  }
}
