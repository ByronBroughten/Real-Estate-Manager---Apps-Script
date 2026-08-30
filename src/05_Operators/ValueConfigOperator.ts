import {
  isBaseValueName,
  type ValueConfigsBase,
} from "../00_base/baseValueSchemas";
import type { SpreadsheetNamedProps } from "../04_SpreadsheetNamed/ClassBases/SpreadsheetNamedBase";
import { ColumnConfigOperator } from "./ColumnConfigOperator";
import { GenericSheetOperator } from "./GenericSheetOperator";

export class ValueConfigOperator extends GenericSheetOperator<"valueConfig"> {
  constructor(props: SpreadsheetNamedProps) {
    super({
      sheetName: "valueConfig",
      ...props,
    });
  }
  static init(): ValueConfigOperator {
    return new ValueConfigOperator(
      ValueConfigOperator.initSpreadsheetNamedProps(),
    );
  }
  get columnConfigOperator(): ColumnConfigOperator {
    return new ColumnConfigOperator(this.spreadsheetNamedProps);
  }
  get activeHeaders(): string[] {
    return this.columnConfigOperator.activeValueTitles.filter(
      (valueName) => !isBaseValueName(valueName),
    );
  }
  newValueConfigs(): ValueConfigsBase {
    return this.activeHeaders.reduce(
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
      `import { makeValueConfigs } from "../00_base/baseValueSchemas";`,
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
