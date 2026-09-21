import type { SheetChange } from "../PlatformEvents/sheetChange";

export class AppsScript {
  static projectProperties(key: string): string | null {
    return PropertiesService.getScriptProperties().getProperty(key);
  }
  static sheetChange(
    changeType: GoogleAppsScript.Events.SheetsOnChange["changeType"],
  ): SheetChange | null {
    if (changeType === "REMOVE_GRID") return "sheetRemoved";
    if (changeType === "OTHER") return "other";
    return null;
  }
  static toast(message: string): void {
    SpreadsheetApp.getActive().toast(message);
  }
  static get trigger() {
    return {
      deleteAllTriggers(): void {
        const triggers = ScriptApp.getProjectTriggers();
        for (const trigger of triggers) {
          ScriptApp.deleteTrigger(trigger);
        }
      },
      addOnEdit(fnName: string): void {
        ScriptApp.newTrigger(fnName)
          .forSpreadsheet(SpreadsheetApp.getActive())
          .onEdit()
          .create();
      },
      addOnChange(fnName: string): void {
        ScriptApp.newTrigger(fnName)
          .forSpreadsheet(SpreadsheetApp.getActive())
          .onChange()
          .create();
      },
      addFirstOfMonth: function (fnName: string) {
        ScriptApp.newTrigger(fnName).timeBased().onMonthDay(1).create();
      },
      addEveryMinute: function (fnName: string) {
        ScriptApp.newTrigger(fnName).timeBased().everyMinutes(1).create();
      },
    };
  }
}
