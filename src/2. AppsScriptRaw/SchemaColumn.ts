import { ColumnSchemaRaw } from "../1.1 SpreadsheetSchemaRaw/ColumnSchemaRaw";
import { ColumnRawBase } from "./ClassBases/ColumnRawBase";
import { SchemaSheetRaw } from "./SchemaSheetRaw";

export class SchemaColumn extends ColumnRawBase {
  get schema(): ColumnSchemaRaw {
    return new ColumnSchemaRaw(this.sheetGid, this.colIndex);
  }
  get sheet(): SchemaSheetRaw {
    return new SchemaSheetRaw(this.sheetRawProps);
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
