import type { ColumnName } from "../01_generatedConfigs/columnConfigsTypes";
import { type SheetConfigsBase } from "../01_generatedConfigs/sheetConfigBuilder";
import { SheetNamedBase } from "./ClassBases/SheetNamedBase";
import type { SpreadsheetNamedProps } from "./ClassBases/SpreadsheetNamedBase";
import type { ColumnNamed } from "./ColumnNamed";
import type { SheetNamed } from "./SheetNamed";
import { SpreadsheetNamed } from "./SpreadsheetNamed";
import { SpreadsheetSchemaNamed } from "./SpreadsheetSchemaNamed";

export class SheetConfigOperator extends SheetNamedBase<"sheetConfig"> {
  constructor(props: SpreadsheetNamedProps) {
    super({
      sheetName: "sheetConfig",
      ...props,
    });
  }
  static init(): SheetConfigOperator {
    return new SheetConfigOperator(
      SheetConfigOperator.initSpreadsheetNamedProps(),
    );
  }
  get sheet(): SheetNamed<"sheetConfig"> {
    return this.ss.sheet(this.sheetName);
  }
  column<CN extends ColumnName<"sheetConfig">>(
    columnName: CN,
  ): ColumnNamed<"sheetConfig", CN> {
    return this.sheet.column(columnName);
  }
  get ss(): SpreadsheetNamed {
    return new SpreadsheetNamed(this.spreadsheetNamedProps);
  }
  get schema(): SpreadsheetSchemaNamed {
    return new SpreadsheetSchemaNamed();
  }
  fetchAndUpdateAll() {
    this.ss.raw.fetchAllSheetProperties();
    this.sheet.data.prepFetchColumnsFull(
      "sheetGid",
      "sheetTitle",
      "hasIdColumn",
    );
    this.ss.fetchAllPrepped({ skipFetchingProperties: true });
    this._updateAll();
  }
  private _updateAll() {
    this._deleteStaleSheetConfigs();
    this._appendMissingSheetConfigs();
    this._updateProgrammaticValues();
  }
  private _deleteStaleSheetConfigs() {
    this.sheet.data.rows.forEach((row) => {
      const configGid = row.value("sheetGid");
      if (configGid === "" || !this.ss.raw.gidIsActive(configGid)) {
        row.delete();
      }
    });
  }
  private _appendMissingSheetConfigs() {
    const colGid = this.sheet.column("sheetGid").data;
    this.ss.raw.activeSheetGids.forEach((sheetGid) => {
      if (!colGid.hasValue(sheetGid)) {
        this.sheet.data.appendRowWithVals({ sheetGid });
      }
    });
  }
  private _updateProgrammaticValues(): void {
    const col = this.sheet.data.columns(
      "sheetGid",
      "sheetTitle",
      "hasIdColumn",
    );
    let updatedValues = 0;
    this.sheet.data.rowIndexesActive.forEach((rowIndex) => {
      const sheetTitle = col.sheetTitle.value(rowIndex);
      const sheetGid = col.sheetGid.valueNotEmpty(rowIndex);
      const activeSheet = this.ss.raw.sheet(sheetGid);
      if (sheetTitle !== activeSheet.title) {
        col.sheetTitle.cell(rowIndex).updateValue(activeSheet.title);
        updatedValues++;
      }
      const hasIdCol = col.hasIdColumn.value(rowIndex);
      const actualHasIdCol = activeSheet.headerRow.hasValue("ID");
      if (hasIdCol !== actualHasIdCol) {
        col.hasIdColumn.cell(rowIndex).updateValue(actualHasIdCol);
        updatedValues++;
      }
    });
    Logger.log(`Corrected ${updatedValues} inaccurate Sheet Config cells.`);
  }
  generateSheetConfigFileSource(): string {
    this.fetchAndUpdateAll();

    this.ss.raw.fetchAllSheetProperties();
    const col = this.sheet.data.prepFetchColumnsFull(
      "sheetGid",
      "sheetTitle",
      "hasIdColumn",
      "idPrefix",
    );
    this.ss.fetchAllPrepped({ skipFetchingProperties: true });
    this._updateAll();
    const entries: SheetConfigsBase = {};
    this.sheet.data.rowIndexesActive.forEach((rowIndex) => {
      const title = col.sheetTitle.value(rowIndex);
      const sheetName = this.schema.sheetNameFromTitle(title);
      entries[sheetName] = {
        sheetGid: col.sheetGid.valueNotEmpty(rowIndex),
        idPrefix: col.idPrefix.value(rowIndex),
        hasIdColumn: col.hasIdColumn.valueNotEmpty(rowIndex),
      };
    });
    const sheetConfigsData: SheetConfigsBase = {
      // ...baseSheetConfigs,
      ...entries,
    };
    return [
      `import { makeSheetConfigs} from "./sheetConfigBuilder";`,
      ``,
      `export const sheetConfigs = makeSheetConfigs(${JSON.stringify(
        sheetConfigsData,
        null,
        2,
      )});`,
      ``,
    ].join("\n");
  }
}
