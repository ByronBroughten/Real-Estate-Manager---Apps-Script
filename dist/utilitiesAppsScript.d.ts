import type { GenericRangeObj } from "./types.js";
export type RangeData = {
    range: string;
    values: any[][];
};
export declare const asU: {
    trigger: {
        addFirstOfMonth: (...functionNames: string[]) => void;
        addEveryMinute: (...functionNames: string[]) => void;
    };
    standardize: {
        date: (dateObj: Date) => string;
    };
    range: {
        getNamed: (rangeName: any) => GoogleAppsScript.Spreadsheet.Range;
        makeGenericRangeObj: (genToRangeNames: any) => GenericRangeObj;
        makeRangeData: (genericRangeObj: any, genNameArr?: string[]) => RangeData[];
    };
    spreadsheet: {
        getActiveSpreadsheetId: () => string;
    };
    batchUpdateRanges: (rangeDataArr: RangeData[], spreadsheetId: string) => void;
};
//# sourceMappingURL=utilitiesAppsScript.d.ts.map