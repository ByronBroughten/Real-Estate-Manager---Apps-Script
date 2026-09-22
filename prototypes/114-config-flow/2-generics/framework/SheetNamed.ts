// PROTOTYPE #114, throwaway: tier 04 becomes SheetNamed<C, SN>.
import type { ColumnName, ColumnValue, ConfigSetBase, SheetName } from "./configs";

export class SheetNamed<C extends ConfigSetBase, SN extends SheetName<C>> {
  constructor(
    readonly configs: C,
    readonly sheetName: SN,
    private readonly rows: Record<string, unknown>[],
  ) {}
  header(col: ColumnName<C, SN>): string {
    const cols: Record<string, { header: string }> = this.configs.columnConfigs[this.sheetName]!;
    return cols[col]!.header;
  }
  value<CN extends ColumnName<C, SN>>(row: number, col: CN): ColumnValue<C, SN, CN> {
    return this.rows[row]![col] as ColumnValue<C, SN, CN>;
  }
  setValue<CN extends ColumnName<C, SN>>(row: number, col: CN, value: ColumnValue<C, SN, CN>): void {
    this.rows[row]![col] = value;
  }
}
