import { makeStructuredConfig, type CellValueName } from "../00_base/base";
import { baseSheetConfigs } from "../01_generatedConfigs/baseSheetConfigs";
import type { ColumnName } from "../01_generatedConfigs/columnConfigsTypes";
import { type SheetConfigsBase } from "../01_generatedConfigs/sheetConfigBuilder";
import { Obj } from "../utils/Obj";
import { SheetNamedBase } from "./ClassBases/SheetNamedBase";
import type { SpreadsheetNamedProps } from "./ClassBases/SpreadsheetNamedBase";
import type { ColumnNamed } from "./ColumnNamed";
import type { SheetNamed } from "./SheetNamed";
import { SpreadsheetNamed } from "./SpreadsheetNamed";
import { SpreadsheetSchemaNamed } from "./SpreadsheetSchemaNamed";

const idPrefix = baseSheetConfigs.sheetConfig.idPrefix;
const headerToValueNameAuto = makeStructuredConfig(
  {} as Record<string, CellValueName>,
  {
    "Sheet GID": "number",
    "Sheet title": "string",
    "Has ID column": "boolean",
  } as const,
);
const headerToValueNameUser = makeStructuredConfig(
  {} as Record<string, CellValueName>,
  {
    "Let api access traits": "boolean" as CellValueName,
    "ID prefix": "string" as CellValueName,
  } as const,
);
const headerToValueName = {
  ...headerToValueNameAuto,
  ...headerToValueNameUser,
} as const;

const programmaticConfigHeaders = Obj.keys(headerToValueNameAuto);
const userConfigHeaders = Obj.keys(headerToValueNameUser);
const sheetConfigHeaders = Obj.keys(headerToValueName);

type HeaderToValueName = typeof headerToValueName;
type SheetConfigHeader = (typeof sheetConfigHeaders)[number];

export class SheetConfigOperator extends SheetNamedBase<"sheetConfig"> {
  constructor(props: SpreadsheetNamedProps) {
    super({
      sheetName: "sheetConfig",
      ...props,
    });
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
    this._fetchAllPreppedNeededForUpdate();
    this._deleteStaleSheetConfigs();
    this._appendMissingSheetConfigs();
    this._updateProgrammaticValues();
  }
  private _fetchAllPreppedNeededForUpdate() {
    this.ss.raw.fetchAllSheetProperties();
    this.sheet.raw.fetchColumnIds();
    this.sheet.prepFetchColumnsFull("sheetGid", "sheetTitle", "hasIdColumn");
    this.ss.fetchAllPrepped({ skipFetchingProperties: true });
  }
  private _deleteStaleSheetConfigs() {
    this.sheet.dataRows.forEach((row) => {
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
        this.sheet.appendRowWithVals({ sheetGid });
      }
    });
  }
  private _updateProgrammaticValues(): void {
    const col = this.sheet.columns("sheetGid", "sheetTitle", "hasIdColumn");
    let updatedValues = 0;
    this.sheet.dataRowIndexesActive.forEach((rowIndex) => {
      const sheetTitle = col.sheetTitle.data.value(rowIndex);
      const sheetGid = col.sheetGid.data.valueNotEmpty(rowIndex);
      const activeSheet = this.ss.sheetByGid(sheetGid);
      if (sheetTitle !== activeSheet.raw.title) {
        col.sheetTitle.data.cell(rowIndex).updateValue(activeSheet.raw.title);
        updatedValues++;
      }
      const hasIdCol = col.hasIdColumn.data.value(rowIndex);
      const actualHasIdCol = activeSheet.raw.headerRow.hasValue("ID");
      if (hasIdCol !== actualHasIdCol) {
        col.hasIdColumn.data.cell(rowIndex).updateValue(actualHasIdCol);
        updatedValues++;
      }
    });
    Logger.log(`Corrected ${updatedValues} inaccurate Sheet Config cells.`);
  }
  generateSheetConfigFileSource(): string {
    const col = this.sheet.columns(
      "sheetGid",
      "sheetTitle",
      "idPrefix",
      "hasIdColumn",
    );

    this.sheet.gatherFetchProperties();
    this.ss.fetchAllPrepped();
    this.sheet.gatherFetchDataColumnsUsingHeaders(
      "Sheet name",
      "ID prefix",
      "Has ID column",
    );
    this.ss.fetchAllPrepped();

    const gidCol = col.sheetGid.data;
    const titleCol = col.sheetTitle.data;
    const prefixCol = col.idPrefix.data;
    const hasIdCol = col.hasIdColumn.data;

    const entries: SheetConfigsBase = {};
    this.sheet.dataRowIndexesActive.forEach((rowIndex) => {
      const title = titleCol.value(rowIndex);
      const sheetName = this.schema.sheetNameFromTitle(title);
      entries[sheetName] = {
        sheetGid: Number(gidCol.value(rowIndex)),
        idPrefix: String(prefixCol.value(rowIndex)),
        hasIdColumn: Boolean(hasIdCol.value(rowIndex)),
      };
    });

    const sheetConfigsData: SheetConfigsBase = {
      ...baseSheetConfigs,
      ...entries,
    };

    return [
      `import { type SheetConfigsBase } from "./sheetConfigBuilder";`,
      ``,
      `export function makeSheetConfigs<T extends SheetConfigsBase>(`,
      `  sheetConfigs: T,`,
      `): T {`,
      `  return sheetConfigs;`,
      `}`,
      ``,
      `export const sheetConfigs = makeSheetConfigs(${JSON.stringify(
        sheetConfigsData,
        null,
        2,
      )});`,
      ``,
    ].join("\n");
  }
  // private _ensureHeaders() {
  //   const numFixed = this.sheet.ensureColumnsOfHeadersExist(
  //     idPrefix,
  //     ...this.headers,
  //   );
  //   if (numFixed > 0) {
  //     Logger.log(
  //       `Added ${numFixed} missing header(s) to the "Sheet Config" sheet.`,
  //     );
  //   }
  // }
}
