import type { SheetChange } from "../PlatformEvents/sheetChange";
import type { SheetEdit } from "../PlatformEvents/sheetEdit";

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
  // Google's event rows and columns are 1-based.
  static sheetEdit(e: GoogleAppsScript.Events.SheetsOnEdit): SheetEdit {
    return {
      sheetGid: e.range.getSheet().getSheetId(),
      rowIndexBase0: e.range.getRow() - 1,
      colIndexBase0: e.range.getColumn() - 1,
      value: e.value,
    };
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
