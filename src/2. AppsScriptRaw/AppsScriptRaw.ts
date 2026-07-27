export class AppScriptRaw {
  static get trigger() {
    return {
      deleteAll(): void {
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
