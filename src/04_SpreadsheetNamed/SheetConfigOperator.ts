import { makeStructuredConfig, type CellValueName } from "../00_base/base";
import { baseSheetConfigs } from "../01_generatedConfigs/baseSheetConfigs";
import type { ColumnName } from "../01_generatedConfigs/columnConfigsTypes";
import { type SheetConfigsBase } from "../01_generatedConfigs/sheetConfigBuilder";
import { Arr } from "../utils/Arr";
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
    this.ss.fetchAllPreppedSheetProperties();
    this.sheet.uniformRow("header").gatherFetchFull();
    this.ss.fetchAllPrepped();
    const gidCol = this.column("Sheet GID").data.gatherFetchAll();
    this.ss.fetchAllPrepped();
    gidCol.valueArr.forEach((gid) => {
      const sheet = this.ss.sheet(gid);
      sheet.uniformRow("header").gatherFetchFull();
    });
    this.sheet.gatherFetchDataColumnsUsingHeaders(
      ...Arr.excludeStrict(sheetConfigHeaders, "Sheet GID"),
    );
    this.ss.fetchAllPrepped();
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
    const gidCol = this.column("sheetGid");
    gidCol.indexed.dataValueArr.forEach((gid) => {
      if (!this.ss.raw.gidIsActive(gid)) {
        this.sheet.appendDataRowValues(new Map([[gidCol.colIndex, gid]]));
      }
    });
  }
  private _updateProgrammaticValues(): void {
    const gidCol = this.column("Sheet GID").data;
    const sheetTitleCol = this.column("Sheet title").data;
    const hasColForIdCol = this.column("Has ID column").data;
    let updatedValues = 0;
    this.sheet.activeDataRowIndexes.forEach((rowIndex) => {
      const sheetGid = gidCol.dataValue(rowIndex);
      const sheetTitle = sheetTitleCol.dataValue(rowIndex);

      const activeSheet = this.ss.sheet(sheetGid);
      if (sheetTitle !== activeSheet.title) {
        sheetTitleCol.updateDataCell(rowIndex, activeSheet.title);
        updatedValues++;
      }
      const hasIdCol = hasColForIdCol.dataValue(rowIndex);
      const actualHasIdCol = activeSheet.headerRow.hasValue("ID");
      if (hasIdCol !== actualHasIdCol) {
        hasColForIdCol.updateDataCell(rowIndex, actualHasIdCol);
        updatedValues++;
      }
    });
    Logger.log(`Corrected ${updatedValues} inaccurate Sheet Config cells.`);
  }
  generateSheetConfigFileSource(): string {
    this.sheet.gatherFetchProperties();
    this.sheet.uniformRow("header").gatherFetchFull();
    this.ss.fetchAllPrepped();
    this.sheet.gatherFetchDataColumnsUsingHeaders(
      "Sheet name",
      "ID prefix",
      "Has ID column",
    );
    this.ss.fetchAllPrepped();

    const gidCol = this.column("Sheet GID").data;
    const titleCol = this.column("Sheet title").data;
    const prefixCol = this.column("ID prefix").data;
    const hasIdCol = this.column("Has ID column").data;

    const entries: SheetConfigsBase = {};
    this.sheet.activeDataRowIndexes.forEach((rowIndex) => {
      const title = titleCol.dataValue(rowIndex);
      const sheetName = this.schema.sheetNameFromTitle(title);
      entries[sheetName] = {
        sheetGid: Number(gidCol.dataValue(rowIndex)),
        idPrefix: String(prefixCol.dataValue(rowIndex)),
        hasIdColumn: Boolean(hasIdCol.dataValue(rowIndex)),
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
