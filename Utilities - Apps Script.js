const asU = {
  trigger: triggerUtils,
  standardize: _standardizeUtils,
  range: _rangeUtils,
  
  batchUpdateRanges: function(rangeData, spreadsheetId) {
    Sheets.Spreadsheets.Values.batchUpdate({
    valueInputOption: "USER_ENTERED",
    data: rangeData
  }, spreadsheetId)
  }
};

const _rangeUtils = {
  getNamed: function(rangeName) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const namedRange = ss.getRangeByName(rangeName);

    if (namedRange) {
      return namedRange;
    } else {
      throw new Error(`Named range for "${name}" not found.`)
    }
  },
  makeGenericRangeObj: function(genToRangeNames) {
    const genericRangeObj = {}
    for (const [genName, rangeName] of Object.entries(genToRangeNames)) {
      namedRange = getNamedRange(rangeName);
      genericRangeObj[genName] = {
        rn: rangeName,
        vls: namedRange.getValues()
      }
    }
    return namedValues
  },
  makeRangeData: function(genericRangeObj, genNameArr=null) {
    const rangeData = [];
    if (genNameArr === null) {
      genNameArr = Object.keys(genericRangeObj)
    }

    for (const genName of genNameArr) {
      rangeData.push({
        range: genericRangeObj[genName].rn,
        values: genericRangeObj[genName].vls
      })
    }
    return rangeData;
  }
}


const _triggerUtils = {
  addFirstOfMonth: function(...functionNames) {
    for (functionName of functionNames) {
      ScriptApp.newTrigger(functionName).timeBased().onMonthDay(1).create();
    }
  },
  addEveryMinute: function(...functionNames) {
    for (functionName of functionNames) {
      ScriptApp.newTrigger(name).timeBased().everyMinutes(1).create();  
    }
  }
}

const _standardizeUtils = {
  date: function(dateObj) {
    return Utilities.formatDate(dateObj, SpreadsheetApp.getActive().getSpreadsheetTimeZone(), "MM/dd/yyyy")
  }
}

function mailAppExample() {
  try {
    // Your script logic here
    // For example, if a specific cell value is incorrect:
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var cellValue = sheet.getRange("A1").getValue();

    if (cellValue !== "Expected Value") {
      throw new Error("Cell A1 does not contain the expected value.");
    }
  } catch (e) {
    // Send an email if an error occurs
    MailApp.sendEmail("your_email@example.com", "Apps Script Error Alert", "An error occurred in your script: " + e.message);
  }
}


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
