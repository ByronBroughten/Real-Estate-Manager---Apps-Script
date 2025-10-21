import type { SectionName } from "../appSchema/1. attributes/sectionAttributes.js";
import type {
  SectionValues,
  VarbName,
  VarbValue,
} from "../appSchema/1. attributes/varbAttributes.js";
import { SectionsSchema } from "../appSchema/3. generated/sectionsSchema.js";
import {
  type BatchUpdateRequest,
  type DataFilterRange,
} from "../utilitiesAppsScript.js";
import { Obj } from "../utils/Obj.js";
import type {
  HeaderIndices,
  Rows,
  SheetState,
} from "./HandlerBases/SheetBase.js";
import {
  SpreadsheetBase,
  type SpreadsheetState,
} from "./HandlerBases/SpreadsheetBase.js";
import { Sheet } from "./Sheet.js";

type SheetProps = { isAddOnly?: boolean };

export class Spreadsheet extends SpreadsheetBase {
  static init(): Spreadsheet {
    return new Spreadsheet({
      spreadsheetState: {} as SpreadsheetState,
      sectionsSchema: new SectionsSchema(),
      gss: SpreadsheetApp.getActiveSpreadsheet(),
    });
  }
  gSheetBySectionName(
    sectionName: SectionName
  ): GoogleAppsScript.Spreadsheet.Sheet {
    const schema = this.sectionsSchema.section(sectionName);
    return this.gss.getSheetById(schema.sheetId);
  }
  private initSheetState<SN extends SectionName>(
    sectionName: SN,
    props: SheetProps
  ): SheetState<SN> {
    const schema = this.sectionsSchema.section(sectionName);
    const sheet = this.gss.getSheetById(schema.sheetId);

    const range = sheet.getDataRange();
    const lastColIdx = range.getLastColumn();
    const lastRowIdx = range.getLastRow();

    const isAddSafe = schema.varbNames.length === lastColIdx;
    const isAddOnly = props.isAddOnly || false;
    if (isAddOnly && !isAddSafe) {
      throw new Error(
        "Sheet is addOnly but not addSafe. Not enough varbNames for columns."
      );
    }

    const headerRowRange = sheet.getRange(
      this.headerRowIdxBase1,
      1,
      1,
      lastColIdx
    );
    const headerValues = headerRowRange.getValues()[0];
    const headerIndices = this.getVarbNameIndicesBase1(
      sectionName,
      headerValues
    );
    const headerOrder = [...schema.varbNames].sort(
      (a, b) => headerIndices[a] - headerIndices[b]
    );

    let bodyRowOrder = [];
    const numRows = lastRowIdx - this.topBodyRowIdxBase1 + 1;
    const areRows = numRows > 0;
    if (areRows) {
      const bodyRowIdRange = sheet.getRange(
        this.topBodyRowIdxBase1,
        1,
        lastRowIdx - this.topBodyRowIdxBase1 + 1,
        1
      );
      const bodyRowIdValues = bodyRowIdRange.getValues();
      bodyRowOrder = bodyRowIdValues.map((row) => row[0]);
    }

    const bodyRows: Rows<SN> = {};
    if (!isAddOnly && areRows) {
      const columns = {} as { [VN in VarbName<SN>]: VarbValue<SN, VN>[] };
      for (const varbName of schema.varbNames) {
        const column = sheet.getRange(
          this.topBodyRowIdxBase1,
          headerIndices[varbName],
          lastRowIdx,
          1
        );
        const columnValues = column.getValues();
        columns[varbName] = columnValues.map((row) => row[0]);
      }
      for (let i = 0; i < bodyRowOrder.length; i++) {
        const rowId = bodyRowOrder[i];
        const rowValues = schema.varbNames.reduce((values, varbName) => {
          const value = columns[varbName][i];
          values[varbName] = value as SectionValues<SN>[typeof varbName];
          return values;
        }, {} as SectionValues<SN>);
        bodyRows[rowId] = rowValues;
      }
    }

    return {
      sheetName: sheet.getName(),
      isAddSafe,
      isAddOnly,
      rowAddCounter: 0,
      headerIndicesBase1: headerIndices,
      headerOrder,
      bodyRows,
      bodyRowOrder,
      changesToSave: {},
      batchUpdateRequests: [],
      rangeData: [],
    };
  }
  get state(): SpreadsheetState {
    return this.spreadsheetState;
  }
  get spreadsheetId(): string {
    return this.gss.getId();
  }
  get sectionNames(): SectionName[] {
    return Obj.keys(this.state);
  }
  sheet<SN extends SectionName>(
    sectionName: SN,
    props: SheetProps = { isAddOnly: false }
  ): Sheet<SN> {
    if (!this.sectionNames.includes(sectionName)) {
      this.state[sectionName] = this.initSheetState(
        sectionName,
        props
      ) as SpreadsheetState[SN];
    }
    return new Sheet({
      sectionName: sectionName,
      ...this.spreadsheetProps,
    });
  }

  appendRange(roughRange: string, rawRows: any[][]) {
    Sheets.Spreadsheets?.Values?.append(
      {
        values: rawRows,
      },
      this.spreadsheetId,
      roughRange,
      {
        valueInputOption: "USER_ENTERED",
      }
    );
  }
  batchUpdateRanges() {
    // const requests = this.getRequests();
    // Sheets.Spreadsheets.batchUpdate({ requests }, this.spreadsheetId);
    const rangeData = this.getRangeData();
    Sheets.Spreadsheets?.Values?.batchUpdateByDataFilter(
      {
        valueInputOption: "USER_ENTERED",
        data: rangeData,
      },
      this.spreadsheetId
    );
  }
  private getRequests(): BatchUpdateRequest[] {
    const requests: BatchUpdateRequest[] = [];
    for (const sectionName of this.sectionNames) {
      const sheet = this.sheet(sectionName);
      requests.push(...sheet.collectRequests());
    }
    return requests;
  }
  private getRangeData(): DataFilterRange[] {
    const rangeData: DataFilterRange[] = [];
    for (const sectionName of this.sectionNames) {
      const sheet = this.sheet(sectionName);
      rangeData.push(...sheet.collectRangeData());
    }
    return rangeData;
  }
  private getVarbNameIndicesBase1<SN extends SectionName>(
    sectionName: SN,
    headers: string[]
  ): HeaderIndices<SN> {
    const schema = this.sectionsSchema.section(sectionName);
    const indicesBase1: HeaderIndices<SN> = {} as HeaderIndices<SN>;
    for (const varbName of schema.varbNames) {
      const { displayName } = schema.varb(varbName);
      const colIdx = headers.indexOf(displayName);
      if (colIdx === -1) {
        throw new Error(
          `Header "${displayName}" not found in sheet for section ${sectionName}`
        );
      }
      indicesBase1[varbName] = colIdx + 1;
    }
    return indicesBase1;
  }
}
