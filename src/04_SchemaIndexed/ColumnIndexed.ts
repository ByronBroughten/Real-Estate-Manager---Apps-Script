import { ColumnRawBase } from "../01_AppsScriptRaw/ClassBases/ColumnRawBase";
import { ColumnSchemaIndexed } from "./ColumnSchemaIndexed";
import { SheetIndexed } from "./SheetIndexed";

export class ColumnIndexed extends ColumnRawBase {
  get schema(): ColumnSchemaIndexed {
    return new ColumnSchemaIndexed(this.sheetGid, this.colIndex);
  }
  get sheet(): SheetIndexed {
    return new SheetIndexed(this.sheetRawProps);
  }
  verifySchemaIdWithActual(): void {
    const colIdInSchema = this.schema.trait("columnId");
    const colIdRow = this.sheet.raw.uniformRow("columnId");
    const actualColId = colIdRow.value(this.colIndex);
    if (actualColId !== colIdInSchema) {
      throw new Error(
        `actualColId is "${actualColId}" but expected "${colIdInSchema}". Are all the column ids and indexes up to date?`,
      );
    }
  }
  dataCellsToDefault() {
    this.sheet.dataRows.forEach((row) => {
      row.updateToDefault(this.colIndex);
    });
  }
  fillEmptyDataCellsWithDefaultValues() {
    this.sheet.dataRows.forEach((row) => {
      if (row.raw.isEmptyCell(this.colIndex)) {
        row.updateToDefault(this.colIndex);
      }
    });
  }
}
