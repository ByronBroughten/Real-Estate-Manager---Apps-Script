import {
  SheetRawBase,
  type SheetRawProps,
} from "../../ClassBases/SheetRawBase";

interface SpecificSheetRawProps<H extends string> extends SheetRawProps {
  headers: readonly H[];
}

export class SpecificSheetRawBase<H extends string> extends SheetRawBase {
  readonly headers: readonly H[];
  constructor({ headers, ...rest }: SpecificSheetRawProps<H>) {
    super(rest);
    this.headers = headers;
  }
}
