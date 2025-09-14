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
  private headerIdx: number;
  private rangeName: string;
  private rangeValues: any[][];
  private headerIndices: { [key: string]: number };

  constructor(rangeName: string, headerIdx: number, declaredHeaders: string[]) {
    const range: GoogleAppsScript.Spreadsheet.Range =
      asU.range.getNamed(rangeName);
    this.headerIdx = headerIdx;
    this.rangeName = rangeName;
    this.rangeValues = range.getValues();
    this.headerIndices = this.initHeaderIndices(declaredHeaders);
  }

  private initHeaderIndices(declaredHeaders: string[]): {
    [key: string]: number;
  } {
    if (declaredHeaders.length === 0) {
      declaredHeaders = this.allHeaders;
    }
    const headerIndex: { [key: string]: number } = {};
    for (const header of declaredHeaders) {
      const index = this.allHeaders.indexOf(header);
      if (index === -1) {
        throw new Error(
          `Header "${header}" not found in range "${this.rangeName}".`
        );
      }
      headerIndex[header] = index;
    }
    return headerIndex;
  }
  private get valueRows(): any[][] {
    return this.rangeValues.slice(1);
  }
  private get allHeaders(): string[] {
    return this.rangeValues[this.headerIdx];
  }
  get headers(): string[] {
    return Object.keys(this.headerIndices);
  }
  get rangeData() {
    return { range: this.rangeName, values: this.rangeValues };
  }
  topValue(header): any {
    const index = this.indexOfHeader(header);
    return this.topValues[index];
  }
  get topValues(): { [key: string]: any } {
    const topValues: { [key: string]: any } = {};
    for (const header of this.headers) {
      topValues[header] = this.topValue(header);
    }
    return topValues;
  }
  private setValue(
    header: string,
    valueRowIndex: number,
    value: any
  ): RangeObj {
    const colIndex = this.headerIdx[header];
    this.setValueAtIndices(valueRowIndex, colIndex, value);
    return this;
  }
  setTopValue(header: string, value: any): RangeObj {
    this.setValue(header, 0, value);
    return this;
  }
  private getValueAtIndices(rowIndex: number, colIndex: number): any {
    return this.rangeValues[rowIndex][colIndex];
  }
  private setValueAtIndices(rowIndex, colIndex, value): RangeObj {
    this.rangeValues[rowIndex][colIndex] = value;
    return this;
  }
  setTopValueRow(headersToValues: HeadersToValues): RangeObj {
    for (const [header, value] of Object.entries(headersToValues)) {
      this.setTopValue(header, value);
    }
    return this;
  }
  private addEmptyRow(): RangeObj {
    this.rangeValues.push(new Array(this.allHeaders.length).fill(""));
    return this;
  }
  addValueRow(headersToValues: HeadersToValues): RangeObj {
    this.addEmptyRow();
    const newRowIndex = this.rangeValues.length - 1;
    this.setValueRow(headersToValues, newRowIndex);
    return this;
  }
  setValueRow(
    headersToValues: HeadersToValues,
    valueRowIndex: number
  ): RangeObj {
    for (const [header, value] of Object.entries(headersToValues)) {
      this.setValue(header, valueRowIndex, value);
    }
    return this;
  }
  indexOfHeader(header): number {
    return this.headerIndices[header];
  }
  valueColumn(header: string) {
    const colIndex = this.indexOfHeader(header);
    const column: any[] = [];
    for (const row of this.valueRows) {
      column.push(row[colIndex]);
    }
    return column;
  }

  static init({
    rangeName,
    headerIdx = 2,
    declaredHeaders = [],
  }: RangeObjInitProps) {
    return new RangeObj(rangeName, headerIdx, declaredHeaders);
  }
}

type RangeObjInitProps = {
  rangeName: string;
  headerIdx?: number;
  valueIdx?: number;
  declaredHeaders?: string[];
};

type HeadersToValues = {
  [key: string]: any;
};

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
  const chargeOnetime: RangeObj = RangeObj.init({
    rangeName: "chargeOnetime",
    declaredHeaders: Object.keys(chargeOnetimeSchema),
  });

  const apiAddChargeOnetime: RangeObj = RangeObj.init({
    rangeName: "apiAddChargeOnetime",
    declaredHeaders: Object.keys(apiChargeOnetimeSchema),
  });
  // add something for resetting values based on schema

  const unit: RangeObj = RangeObj.init({
    rangeName: "unit",
    declaredHeaders: ["ID", "Household ID"],
  });

  const household: RangeObj = RangeObj.init({
    rangeName: "household",
    declaredHeaders: ["ID", "Name"],
  });

  const topValues = apiAddChargeOnetime.topValues;

  chargeOnetime.addValueRow({
    // needs all headers
    // should I validate it or just use typescript?
  });

  asU.batchUpdateRanges(
    [chargeOnetime.rangeData, apiAddChargeOnetime.rangeData],
    spreadsheets.realEstateManager.id
  );
}

const sectionNames = [
  "apiAddChargeOnetime",
  "chargeOnetime",
  "household",
  "unit",
] as const;
