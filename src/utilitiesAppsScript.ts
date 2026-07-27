export type CellValue = number | Date | string | boolean;

export type StandardizedValue<CV extends CellValue> = Exclude<CV, Date>;

export type UpdateCellsRequest =
  GoogleAppsScript.Sheets.Schema.UpdateCellsRequest;

export type UserEnteredValue =
  UpdateCellsRequest["rows"][number]["values"][number]["userEnteredValue"];

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
  value<CV extends CellValue>(value: CV): StandardizedValue<CV> {
    if (value instanceof Date) {
      return this.date(value);
    } else {
      return value as StandardizedValue<CV>;
    }
  },
  date: function (dateObj: Date): string {
    return Utilities.formatDate(
      dateObj,
      SpreadsheetApp.getActive().getSpreadsheetTimeZone(),
      "yyyy-MM-dd",
    );
  },
};

// const _rangeUtils = {
//   getA1({
//     sheetName,
//     startBase1,
//     endBase0,
//   }: {
//     sheetName: string;
//     startBase1: {
//       rowIdx: number;
//       colIdx: number;
//     };
//     endBase0: {
//       rowIdx: number;
//       colIdx: number;
//     };
//   }) {
//     return `'${sheetName}'!${this.indicesToA1(startBase1)}:${this.indicesToA1(
//       endBase0,
//     )}`;
//   },
//   indicesToA1(base0: { rowIdx: number; colIdx: number }) {
//     return `${this.columnIndexToA1(base0.rowIdx)}${this.rowIndexToA1(
//       base0.colIdx,
//     )}`;
//   },
//   rowIndexToA1(rowIndexBase0) {
//     return rowIndexBase0 + 1;
//   },
//   columnIndexToA1(colIndexBase0: number) {
//     let colString = "";
//     let tempIndex = colIndexBase0 + 1;

//     while (tempIndex > 0) {
//       const remainder = (tempIndex - 1) % 26;
//       colString = String.fromCharCode(65 + remainder) + colString;
//       tempIndex = Math.floor((tempIndex - 1) / 26);
//     }
//     return colString;
//   },
// };

const asU = {
  test(): void {},
  standardize: _standardizeUtils,
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
