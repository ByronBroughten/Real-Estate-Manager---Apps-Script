export type CellValue = number | Date | string | boolean;
export type DataFilterRange =
  GoogleAppsScript.Sheets.Schema.DataFilterValueRange;
export type DataFilter = GoogleAppsScript.Sheets.Schema.DataFilter;

const _dataFilterExample: DataFilter = {
  gridRange: {
    sheetId: 0,
    startColumnIndex: 0,
    startRowIndex: 0,
    endColumnIndex: 1,
    endRowIndex: 1,
  },
};

const _dataFilterRangeExample: DataFilterRange = {
  dataFilter: _dataFilterExample,
  values: [[""]],
};

export type RangeData = {
  range: string;
  values: any[][];
};

export type GenericRangeObj = {
  [key: string]: {
    rn: string;
    vls: any[][];
  };
};

const _standardizeUtils = {
  value(value: CellValue): Exclude<CellValue, Date> {
    if (value instanceof Date) {
      return this.date(value);
    } else {
      return value;
    }
  },
  date: function (dateObj: Date): string {
    return Utilities.formatDate(
      dateObj,
      SpreadsheetApp.getActive().getSpreadsheetTimeZone(),
      "MM/dd/yyyy"
    );
  },
};

const _rangeUtils = {
  getA1({
    sheetName,
    startBase1,
    endBase0,
  }: {
    sheetName: string;
    startBase1: {
      rowIdx: number;
      colIdx: number;
    };
    endBase0: {
      rowIdx: number;
      colIdx: number;
    };
  }) {
    return `'${sheetName}'!${this.indicesToA1(startBase1)}:${this.indicesToA1(
      endBase0
    )}`;
  },
  indicesToA1(base0: { rowIdx: number; colIdx: number }) {
    return `${this.columnIndexToA1(base0.rowIdx)}${this.rowIndexToA1(
      base0.colIdx
    )}`;
  },
  rowIndexToA1(rowIndexBase0) {
    return rowIndexBase0 + 1;
  },
  columnIndexToA1(colIndexBase0: number) {
    let colString = "";
    let tempIndex = colIndexBase0 + 1;

    while (tempIndex > 0) {
      const remainder = (tempIndex - 1) % 26;
      colString = String.fromCharCode(65 + remainder) + colString;
      tempIndex = Math.floor((tempIndex - 1) / 26);
    }
    return colString;
  },
  getNamed: function (rangeName): GoogleAppsScript.Spreadsheet.Range {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    const namedRange = ss.getRangeByName(rangeName);

    if (namedRange) {
      return namedRange;
    } else {
      throw new Error(`Named range for "${rangeName}" not found.`);
    }
  },
  makeGenericRangeObj: function (genToRangeNames): GenericRangeObj {
    const genericRangeObj = {};
    for (const [genName, rangeName] of Object.entries(genToRangeNames)) {
      const namedRange = this.getNamed(rangeName);
      genericRangeObj[genName] = {
        rn: rangeName,
        vls: namedRange.getValues(),
      };
    }
    return genericRangeObj;
  },

  makeRangeData: function (
    genericRangeObj,
    genNameArr: string[] = []
  ): RangeData[] {
    const rangeData: RangeData[] = [];
    if (genNameArr.length === 0) {
      genNameArr = Object.keys(genericRangeObj);
    }

    for (const genName of genNameArr) {
      rangeData.push({
        range: genericRangeObj[genName].rn,
        values: genericRangeObj[genName].vls,
      });
    }
    return rangeData;
  },
};

const _triggerUtils = {
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

const _spreadsheetUtils = {
  getActiveSpreadsheetId: function (): string {
    return SpreadsheetApp.getActiveSpreadsheet().getId();
  },
};

const asU = {
  test(): void {},
  trigger: _triggerUtils,
  standardize: _standardizeUtils,
  range: _rangeUtils,
  spreadsheet: _spreadsheetUtils,
};

export { asU };

// function mailAppExample() {
//   try {
//     // Your script logic here
//     // For example, if a specific cell value is incorrect:
//     var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
//     var cellValue = sheet.getRange("A1").getValue();

//     if (cellValue !== "Expected Value") {
//       throw new Error("Cell A1 does not contain the expected value.");
//     }
//   } catch (e) {
//     // Send an email if an error occurs
//     MailApp.sendEmail(
//       "your_email@example.com",
//       "Apps Script Error Alert",
//       "An error occurred in your script: " + e.message
//     );
//   }
// }
