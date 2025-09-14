import { spreadsheets } from "./Constants.js";
import { asU } from "./utilitiesAppsScript.js";
function trigger(e) {
    const addOnetimeChargeRange = asU.range.getNamed("apiAddOnetimeChargeEnter");
    if (e.range.getA1Notation() === addOnetimeChargeRange.getA1Notation()) {
        handleAddOnetimeCharge();
        addOnetimeChargeRange.setValue(false);
    }
}
export class RangeObj {
    constructor(rangeName, headerIdx, declaredHeaders) {
        const range = asU.range.getNamed(rangeName);
        this.headerIdx = headerIdx;
        this.rangeName = rangeName;
        this.rangeValues = range.getValues();
        this.headerIndices = this.initHeaderIndices(declaredHeaders);
    }
    initHeaderIndices(declaredHeaders) {
        if (declaredHeaders.length === 0) {
            declaredHeaders = this.allHeaders;
        }
        const headerIndex = {};
        for (const header of declaredHeaders) {
            const index = this.allHeaders.indexOf(header);
            if (index === -1) {
                throw new Error(`Header "${header}" not found in range "${this.rangeName}".`);
            }
            headerIndex[header] = index;
        }
        return headerIndex;
    }
    get valueRows() {
        return this.rangeValues.slice(1);
    }
    get allHeaders() {
        return this.rangeValues[this.headerIdx];
    }
    get headers() {
        return Object.keys(this.headerIndices);
    }
    get rangeData() {
        return { range: this.rangeName, values: this.rangeValues };
    }
    topValue(header) {
        const index = this.indexOfHeader(header);
        return this.topValues[index];
    }
    get topValues() {
        const topValues = {};
        for (const header of this.headers) {
            topValues[header] = this.topValue(header);
        }
        return topValues;
    }
    setValue(header, valueRowIndex, value) {
        const colIndex = this.headerIdx[header];
        this.setValueAtIndices(valueRowIndex, colIndex, value);
        return this;
    }
    setTopValue(header, value) {
        this.setValue(header, 0, value);
        return this;
    }
    getValueAtIndices(rowIndex, colIndex) {
        return this.rangeValues[rowIndex][colIndex];
    }
    setValueAtIndices(rowIndex, colIndex, value) {
        this.rangeValues[rowIndex][colIndex] = value;
        return this;
    }
    setTopValueRow(headersToValues) {
        for (const [header, value] of Object.entries(headersToValues)) {
            this.setTopValue(header, value);
        }
        return this;
    }
    addEmptyRow() {
        this.rangeValues.push(new Array(this.allHeaders.length).fill(""));
        return this;
    }
    addValueRow(headersToValues) {
        this.addEmptyRow();
        const newRowIndex = this.rangeValues.length - 1;
        this.setValueRow(headersToValues, newRowIndex);
        return this;
    }
    setValueRow(headersToValues, valueRowIndex) {
        for (const [header, value] of Object.entries(headersToValues)) {
            this.setValue(header, valueRowIndex, value);
        }
        return this;
    }
    indexOfHeader(header) {
        return this.headerIndices[header];
    }
    valueColumn(header) {
        const colIndex = this.indexOfHeader(header);
        const column = [];
        for (const row of this.valueRows) {
            column.push(row[colIndex]);
        }
        return column;
    }
    static init({ rangeName, headerIdx = 2, declaredHeaders = [], }) {
        return new RangeObj(rangeName, headerIdx, declaredHeaders);
    }
}
const apiChargeOnetimeSchema = {
    Date: {
        type: "date",
        resetValue: "=TODAY()",
    },
    "Household name": {
        type: "string", //household.Name
    },
    "Currency amount": {
        type: "number",
    },
    Description: {
        type: "string",
    },
    Portion: {
        type: "string", // nrHouseholdPortion
        resetValue: "Household",
    },
    Notes: {
        type: "string",
    },
};
const chargeOnetimeSchema = {
    Date: {
        type: "date",
    },
    ID: {
        // create
        type: "string",
    },
    "Household ID": {
        type: "string",
    },
    "Subsidy ID": {
        // only needed if the portion is "subsidy"
        // can be obtained by most recent subsidy on recurring charges
        type: "string",
    },
    "Expense ID": {
        // optional
        type: "string",
    },
    "Household name": {
        // household[Name]
        type: "formula",
        value: "=FILTER(household[Name], household[ID]=$ColletterRownum)",
    },
    Portion: {
        type: "string",
    },
    Description: {
        type: "string",
    },
    "Dollar amount": {
        type: "number",
    },
    Notes: {
        type: "string",
    },
};
// getDataRegion
export function handleAddOnetimeCharge() {
    const chargeOnetime = RangeObj.init({
        rangeName: "chargeOnetime",
        declaredHeaders: Object.keys(chargeOnetimeSchema),
    });
    const apiAddChargeOnetime = RangeObj.init({
        rangeName: "apiAddChargeOnetime",
        declaredHeaders: Object.keys(apiChargeOnetimeSchema),
    });
    // add something for resetting values based on schema
    const unit = RangeObj.init({
        rangeName: "unit",
        declaredHeaders: ["ID", "Household ID"],
    });
    const household = RangeObj.init({
        rangeName: "household",
        declaredHeaders: ["ID", "Name"],
    });
    const topValues = apiAddChargeOnetime.topValues;
    chargeOnetime.addValueRow({
    // needs all headers
    // should I validate it or just use typescript?
    });
    asU.batchUpdateRanges([chargeOnetime.rangeData, apiAddChargeOnetime.rangeData], spreadsheets.realEstateManager.id);
}
const sectionNames = [
    "apiAddChargeOnetime",
    "chargeOnetime",
    "household",
    "unit",
];
//# sourceMappingURL=addOnetimeCharge.js.map