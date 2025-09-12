function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
}

function trigger(e) {
  const addOnetimeChargeRange = asU.range.getNamed("apiAddOnetimeChargeEnter");
  if (e.range.getA1Notation() === addOnetimeChargeRange.getA1Notation()) {
    handleAddOnetimeCharge();
    addOnetimeChargeRange.setValue(FALSE);
  }
}

function makeRangeObj(rangeName, headerIdx=2, valueIdx=3) {
  const range = asU.range.getNamed(rangeName);
  return {
    rangeName,
    rangeValues: range.getValues(),
    headerIdx,
    valueIdx,
    get valueRows() {
      return this.rangeValues.slice(1)
    },
    get valueRowCount() {
      return this.valueRows.length
    },
    get headers() {
      return this.rangeValues[headerIdx];
    },
    get topValues() {
      return this.rangeValues[valueIdx];
    },
    valueByIndex(rowIndex, colIndex) {
      return this.valueRanges[rowIndex, colIndex];
    },
    setTopValueAtIndex() {

    },
    setTopValue(header, value) {
      this.setValueAtRowIndex(0, header, value);
    },
    setValueAtRowIndex(rowIndex, header, value) {
      const colIndex = this.indexOfHeader(header);
      this.setValueAtIndex(rowIndex, colIndex, value)
    },
    setTopValueAtIndex(colIndex, value) {
      this.setValueAtIndex(this.valueIdx, colIndex, value);
    },
    setValueAtIndex(rowIndex, colIndex, value) {
      this.rangeValues[rowIndex][colIndex] = value;
    },
    setTopValues(headersToValues) {
      return this.setValueAtRowIndex(0, headersToValues);
    },
    setValuesAtRowIndex(rowIndex, headersToValues) {
      for (const [header, value] of Object.entries(headersToValues)) {
        this.setValueAtRowIndex(rowIndex, header, value);
      };
    },
    indexOfHeader(header) {
      return this.rangeValues[headerIdx].indexOf(header);
    },
    column(header) {
      const index = this.indexOfHeader(header);
      const column = [];
      for (const row of this.rowsMinusHeader) {
        column.push(row[index]);
      }
      return column;
    },
    topValue(header) {
      const index = this.indexOfHeader(header);
      return this.topValues[index];k
    }
  }
}

const apiChargeOnetimeSchema = {
  "Date": {
    type: "date",
    resetValue: "=TODAY()"
  },
  "Household name": {
    type: "string",//household.Name
  },
  "Currency amount": {
    type: "number"
  },
  "Description": {
    type: "string",
  },
  "Portion": {
    type: "string",// nrHouseholdPortion
    resetValue: "Household"
  },
  "Notes": {
    type: "string"
  }
}

const chargeOnetimeSchema = {
  "Date": {
    type: "date"
  },
  "ID": {
    // create
    type: "string",
  },
  "Household ID": {
    type: "string"
  },
  "Subsidy ID": {
    // only needed if the portion is "subsidy"
    // can be obtained by most recent subsidy on recurring charges
    type: "string"
  },
  "Expense ID": {
    // optional
    type: "string"
  },
  "Household name": {// household[Name]
    type: "formula",
    value: "=FILTER(household[Name], household[ID]=$ColletterRownum)"
  },
  "Portion": {
    type: "string"
  },
  "Description": {
    type: "string"
  },
  "Dollar amount": {
    type: "number"
  },
  "Notes": {
    type: "string"
  }
}

// getDataRegion
function handleAddOnetimeCharge() {
  // onetimeCharge true columns
  
  []
  

  const chargeOnetime = makeRangeObj("chargeOnetime");

  const rangeObj = makeRangeObj("apiAddOnetimeCharge");

  const unit = makeRangeObj("unit");
   makeRangeObj("household");

  for (const [header, idx] of (rangeObj.headers.entries())) {

    "Date",
    "Household name",
    "Currency amount",
    "Description",
    "Portion",
    "Notes"

    rangeObj.setTopValueAtIndex(idx, )
  }

  asU.batchUpdateRanges([
    {
      range: "apiOnetimeCharge",
      values: rangeObj.rangeValues
    }
  ])

}


