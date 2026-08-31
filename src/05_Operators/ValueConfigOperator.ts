import { isBaseValueName } from "../00_base/baseValueSchemas";
import {
  makeConfigsDirRelativeToConfigs,
  type ValueConfigsBase,
} from "../01_generatedConfigs/makeConfigs";
import type { SpreadsheetNamedProps } from "../04_SpreadsheetNamed/ClassBases/SpreadsheetNamedBase";
import { ColumnConfigOperator } from "./ColumnConfigOperator";
import { GenericSheetOperator } from "./GenericSheetOperator";

export class ValueConfigOperator extends GenericSheetOperator<"valueConfig"> {
  private activeHeaders: Set<string>;
  constructor(props: SpreadsheetNamedProps) {
    super({
      sheetName: "valueConfig",
      ...props,
    });
    this.activeHeaders = new Set();
  }
  static init(): ValueConfigOperator {
    return new ValueConfigOperator(
      ValueConfigOperator.initSpreadsheetNamedProps(),
    );
  }
  get columnConfigOperator(): ColumnConfigOperator {
    return new ColumnConfigOperator(this.spreadsheetNamedProps);
  }
  fetchAfterColumnConfigSynced() {
    this.columnConfigOperator.assertSyncedToSpreadsheet();
    this.activeHeaders = new Set(
      this.columnConfigOperator.activeValueTitles.filter(
        (valueName) => !isBaseValueName(valueName),
      ),
    );
    this.activeHeaders.forEach((header) => {
      this.sheet.raw.columnByHeader(header).data.gatherFetchAll();
    });
    this.ss.fetchAllPrepped({ skipFetchingProperties: true });
  }
  newValueConfigs(): ValueConfigsBase {
    return [...this.activeHeaders].reduce(
      (acc, header) => {
        const valueNameDataCol = this.sheet.raw.columnByHeader(
          header,
          "string",
        ).data;
        const valueName = this.schema.titleToName(header);
        acc[valueName] = valueNameDataCol.valueArrFilterEmpty;
        return acc;
      },
      {} as Record<string, string[]>,
    );
  }
  toFileSource(): string {
    return [
      `import { makeValueConfigs } from ${makeConfigsDirRelativeToConfigs};`,
      ``,
      `export const valueConfigs = makeValueConfigs(${JSON.stringify(
        this.newValueConfigs(),
        null,
        2,
      )});`,
      ``,
    ].join("\n");
  }
}
