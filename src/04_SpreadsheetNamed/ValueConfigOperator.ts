import {
  isBaseValueName,
  type ValueConfigsBase,
} from "../00_base/baseValueSchemas";
import { ColumnConfigOperator } from "../05_Operators/ColumnConfigOperator";
import { GenericSheetOperator } from "../05_Operators/GenericSheetOperator";
import type { SpreadsheetNamedProps } from "./ClassBases/SpreadsheetNamedBase";

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
  get activeConfigValueNames(): string[] {
    return this.columnConfigOperator.sheetData
      .column("valueTitle")
      .valueArrNotEmpty.filter((valueName) => !isBaseValueName(valueName))
      .map((title) => this.schema.titleToName(title));
  }
  newValueConfigs(): ValueConfigsBase {
    return this.activeConfigValueNames.reduce(
      (acc, valueName) => {
        if (this.sheet.schema.isColumnName(valueName)) {
          acc[valueName] = this.sheet.data
            .column(valueName)
            .valueArr.filter(
              (value) => typeof value === "string" && value !== "",
            ) as string[];
        } else {
          throw new Error(
            `valueName "${valueName}" is not a columnName of valueConfigs`,
          );
        }
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
