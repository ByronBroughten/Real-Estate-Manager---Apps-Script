import { ColumnIndexedBase } from "./ColumnIndexedBase";
import { ColumnSchemaIndexed } from "./ColumnSchemaIndexed";
import { SheetIndexed } from "./SheetIndexed";

export class ColumnIndexed extends ColumnIndexedBase {
  get schema(): ColumnSchemaIndexed {
    return new ColumnSchemaIndexed(this.columnIndexedProps);
  }
  get sheet(): SheetIndexed {
    return new SheetIndexed(this.sheetIndexedProps);
  }
  get colIndex() {
    return this.sheet.raw.uniformRow("columnId").colIndexOfValue(this.columnId);
  }
  dataCellsToDefault() {
    this.sheet.dataRows.forEach((row) => {
      row.updateToDefault(this.columnId);
    });
  }
  // Hmmm... Interesting.
  //

  fillEmptyDataCellsWithDefaultValues() {
    this.sheet.dataRows.forEach((row) => {
      if (row.raw.isEmptyCell(this.columnId)) {
        row.updateToDefault(this.columnId);
      }
    });
  }
}
