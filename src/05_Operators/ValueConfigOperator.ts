import { isBaseValueName } from "../00_Source/CellValues/baseValueSchemas";
import {
  makeImportLine,
  type ValueConfigsBase,
} from "../01_SpreadsheetSchema/makeConfigs";
import { ColumnConfigOperator } from "./ColumnConfigOperator";
import { GenericSheetOperator } from "./GenericSheetOperator";
import {
  SpreadsheetBaseOperator,
  type ConfigSyncState,
  type OperatorProps,
} from "./SpreadsheetBaseOperator";

export class ValueConfigOperator extends GenericSheetOperator<"valueConfig"> {
  constructor(props: OperatorProps) {
    super({
      sheetName: "valueConfig",
      ...props,
    });
  }
  get valueConfigSync(): ConfigSyncState["valueConfigSync"] {
    return this.configSyncState.valueConfigSync;
  }
  get activeHeaders(): Set<string> {
    return this.valueConfigSync.activeHeaders;
  }
  static init(): ValueConfigOperator {
    return new ValueConfigOperator(SpreadsheetBaseOperator.initOperatorProps());
  }
  get columnConfigOperator(): ColumnConfigOperator {
    return new ColumnConfigOperator(this.operatorProps);
  }
  fetchAfterColumnConfigSynced() {
    this.columnConfigOperator.assertSyncedToSpreadsheet();
    this.valueConfigSync.activeHeaders = new Set(
      this.columnConfigOperator
        .activeValueTitles()
        .filter((valueName) => !isBaseValueName(valueName)),
    );
    this.activeHeaders.forEach((header) => {
      this.sheet.raw.columnByHeader(header).gatherFetchFull();
    });
    this.ss.fetchAllPrepped({ skipFetchingProperties: true });
  }
  newValueConfigs(): ValueConfigsBase {
    return [...this.activeHeaders].reduce(
      (acc, header) => {
        const valueNameDataCol =
          this.sheet.raw.columnByHeader<"string">(header);
        const valueName = this.schema.titleToName(header);
        acc[valueName] = valueNameDataCol.valueArrFilterEmpty;
        return acc;
      },
      {} as Record<string, string[]>,
    );
  }
  toFileSource(): string {
    return [
      `${makeImportLine("makeValueConfigs")}`,
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
