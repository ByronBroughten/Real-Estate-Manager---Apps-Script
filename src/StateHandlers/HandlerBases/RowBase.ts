import type { SectionName } from "../../appSchema/1. names/sectionNames";
import type { SectionValues } from "../../appSchema/2. attributes/sectionVarbAttributes";
import { SheetBase, type SheetProps } from "./SheetBase";

export type RowState<SN extends SectionName> = SectionValues<SN>;

interface RowProps<SN extends SectionName> extends SheetProps<SN> {
  id: string;
}

export class RowBase<SN extends SectionName> extends SheetBase<SN> {
  readonly id: string;
  constructor({ id, ...props }: RowProps<SN>) {
    super(props);
    this.id = id;
  }
  get rowState(): RowState<SN> {
    return this.sheetState.bodyRows[this.id];
  }
}
