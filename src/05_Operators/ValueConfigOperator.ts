import { isBaseValueName } from "../00_base/baseValueSchemas";
import {
  makeImportLine,
  type ValueConfigsBase,
} from "../01_generatedConfigs/makeConfigs";
import { ColumnConfigOperator } from "./ColumnConfigOperator";
import { GenericSheetOperator } from "./GenericSheetOperator";
import {
  OperatorBase,
  type ConfigSyncState,
  type OperatorProps,
} from "./OperatorBase";

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
    return new ValueConfigOperator(OperatorBase.initOperatorProps());
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
