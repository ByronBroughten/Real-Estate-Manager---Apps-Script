export class AppsScript {
  static projectProperties(key: string): string | null {
    return PropertiesService.getScriptProperties().getProperty(key);
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
      addFirstOfMonth: function (fnName: string) {
        ScriptApp.newTrigger(fnName).timeBased().onMonthDay(1).create();
      },
      addEveryMinute: function (fnName: string) {
        ScriptApp.newTrigger(fnName).timeBased().everyMinutes(1).create();
      },
    };
  }
}
