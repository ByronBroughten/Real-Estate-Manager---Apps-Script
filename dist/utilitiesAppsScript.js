const _standardizeUtils = {
    date: function (dateObj) {
        return Utilities.formatDate(dateObj, SpreadsheetApp.getActive().getSpreadsheetTimeZone(), "MM/dd/yyyy");
    },
};
const _rangeUtils = {
    getNamed: function (rangeName) {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const namedRange = ss.getRangeByName(rangeName);
        if (namedRange) {
            return namedRange;
        }
        else {
            throw new Error(`Named range for "${rangeName}" not found.`);
        }
    },
    makeGenericRangeObj: function (genToRangeNames) {
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
    makeRangeData: function (genericRangeObj, genNameArr = []) {
        const rangeData = [];
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
    addFirstOfMonth: function (...functionNames) {
        for (const functionName of functionNames) {
            ScriptApp.newTrigger(functionName).timeBased().onMonthDay(1).create();
        }
    },
    addEveryMinute: function (...functionNames) {
        for (const functionName of functionNames) {
            ScriptApp.newTrigger(functionName).timeBased().everyMinutes(1).create();
        }
    },
};
const _spreadsheetUtils = {
    getActiveSpreadsheetId: function () {
        return SpreadsheetApp.getActiveSpreadsheet().getId();
    },
};
export const asU = {
    trigger: _triggerUtils,
    standardize: _standardizeUtils,
    range: _rangeUtils,
    spreadsheet: _spreadsheetUtils,
    batchUpdateRanges: function (rangeDataArr, spreadsheetId) {
        var _a, _b;
        (_b = (_a = Sheets.Spreadsheets) === null || _a === void 0 ? void 0 : _a.Values) === null || _b === void 0 ? void 0 : _b.batchUpdate({
            valueInputOption: "USER_ENTERED",
            data: rangeDataArr,
        }, spreadsheetId);
    },
};
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
//# sourceMappingURL=utilitiesAppsScript.js.map