// PROTOTYPE #114, throwaway: tier 04 shape unchanged, still SheetNamed<SN>.
import { header, type ColumnName, type ColumnValue, type SheetName } from "./configs";

export class SheetNamed<SN extends SheetName> {
  constructor(
    readonly sheetName: SN,
    private readonly rows: Record<string, unknown>[],
  ) {}
  header(col: ColumnName<SN>): string {
    return header(this.sheetName, col);
  }
  value<CN extends ColumnName<SN>>(row: number, col: CN): ColumnValue<SN, CN> {
    return this.rows[row]![col] as ColumnValue<SN, CN>;
  }
  setValue<CN extends ColumnName<SN>>(row: number, col: CN, value: ColumnValue<SN, CN>): void {
    this.rows[row]![col] = value;
  }
}
