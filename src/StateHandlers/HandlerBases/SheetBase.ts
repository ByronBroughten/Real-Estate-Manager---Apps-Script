import type { SectionName } from "../../appSchema/1. attributes/sectionAttributes";
import type { VarbName } from "../../appSchema/1. attributes/varbAttributes";
import type { SectionSchema } from "../../appSchema/3. generated/sectionsSchema";
import type {
  BatchUpdateRequest,
  DataFilterRange,
} from "../../utilitiesAppsScript";
import type { RowState } from "./RowBase";

import { SpreadsheetBase, type SpreadsheetProps } from "./SpreadsheetBase";

export type RowChangesToSave<SN extends SectionName> = {
  add: boolean;
  delete: boolean;
  update: Set<VarbName<SN>>;
};

export type ChangesToSave<SN extends SectionName> = {
  [rowId: string]: RowChangesToSave<SN>;
};

export type HeaderIndices<SN extends SectionName> = {
  [VN in VarbName<SN>]: number;
};
export type Rows<SN extends SectionName> = {
  [id in string]: RowState<SN>;
};

export type SheetState<SN extends SectionName> = {
  sheetName;

  unaccountedHeaders: string[];
  isAddOnly: boolean;
  rowAddCounter: number;

  // Does rows include headers? No. I want their data to be consistent.
  bodyRows: Rows<SN>;
  bodyRowOrder: string[];
  headerIndicesBase1: HeaderIndices<SN>;
  headerOrder: VarbName<SN>[];

  changesToSave: ChangesToSave<SN>;
  rangeData: DataFilterRange[];
  batchUpdateRequests: BatchUpdateRequest[];
};

export interface SheetProps<SN extends SectionName> extends SpreadsheetProps {
  sectionName: SN;
}

export class SheetBase<SN extends SectionName> extends SpreadsheetBase {
  readonly sectionName: SN;
  constructor({ sectionName, ...props }: SheetProps<SN>) {
    super(props);
    this.sectionName = sectionName;
  }
  get sheetState(): SheetState<SN> {
    return this.spreadsheetState[this.sectionName];
  }
  get sheetProps(): SheetProps<SN> {
    return {
      sectionName: this.sectionName,
      ...this.spreadsheetProps,
    };
  }
  get sectionSchema(): SectionSchema<SN> {
    return this.sectionsSchema.section(this.sectionName);
  }
}
