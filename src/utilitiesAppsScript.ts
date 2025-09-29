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
  date: function (dateObj: Date): string {
    return Utilities.formatDate(
      dateObj,
      SpreadsheetApp.getActive().getSpreadsheetTimeZone(),
      "MM/dd/yyyy"
    );
  },
};

const _rangeUtils = {
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
  addFirstOfMonth: function (...functionNames: string[]) {
    for (const functionName of functionNames) {
      ScriptApp.newTrigger(functionName).timeBased().onMonthDay(1).create();
    }
  },
  addEveryMinute: function (...functionNames: string[]) {
    for (const functionName of functionNames) {
      ScriptApp.newTrigger(functionName).timeBased().everyMinutes(1).create();
    }
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
  batchUpdateRanges: function (
    rangeDataArr: RangeData[],
    spreadsheetId: string
  ) {
    Sheets.Spreadsheets?.Values?.batchUpdate(
      {
        valueInputOption: "USER_ENTERED",
        data: rangeDataArr,
      },
      spreadsheetId
    );
  },
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

// function getNamedRanges(rangeNames) {
//   const namedRanges = {};
//   for (const name of rangeNames) {
//     namedRanges[name] = getNamedRange(name);
//   }
//   return namedRanges;
// }

// function getNamedRangeIds() {
//   const spreadsheet = Sheets.Spreadsheets.get(spreadsheetId);
// const sheet = spreadsheet.getSheetById(sheetId);
// const namedRanges = sheet.getNamedRanges()
// for (let i = 0; i < namedRanges.length; i++) {
//   const namedRange = namedRanges[i];
//   const namedRangeName = namedRange.getName();
//   const namedRangeId = namedRange.getId();
//   Logger.log(`Named Range Name: ${namedRangeName}, ID: ${namedRangeId}`);
// }
// }
