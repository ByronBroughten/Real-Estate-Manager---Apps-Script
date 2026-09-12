import type { SheetDataValuesAll } from "../../01_generatedConfigs/columnConfigsTypes";
import { SheetNamedBase } from "../../04_SpreadsheetNamed/ClassBases/SheetNamedBase";
import type { SpreadsheetNamedProps } from "../../04_SpreadsheetNamed/ClassBases/SpreadsheetNamedBase";
import type { RowNamed } from "../../04_SpreadsheetNamed/RowNamed";
import type { SheetNamed } from "../../04_SpreadsheetNamed/SheetNamed";
import { SpreadsheetNamed } from "../../04_SpreadsheetNamed/SpreadsheetNamed";
import {
  RowIdByNameOperator,
  type RowIdByName,
} from "../../05_Operators/RowIdByNameOperator";
import type {
  ActionReturn,
  RowReports,
  RunReport,
} from "../../06_API/Endpoints";

type StagingRow = RowNamed<"addPropertyExpense">;
type NameUnresolved = Exclude<RowIdByName, { found: "one" }>;
type NamedSheetName = "unit" | "property" | "splitReceipt";

// The columns a person types into; the run status is left out so its own message can't make a row look filled in.
const typedColumns = [
  "date",
  "propertyName",
  "unitName",
  "billerName",
  "description",
  "amount",
  "expenseCategory",
  "taxAdjust",
  "receiptFormat",
  "notes",
  "splitReceiptName",
  "isUpfrontInvestment",
] as const;

interface PlaceNames {
  unitName: string;
  propertyName: string;
}

// The ids are read only where no complaint stands beside them.
interface ExpensePlace {
  propertyId: string;
  unitId: string;
  complaints: string[];
}

interface SplitReceiptRef {
  splitReceiptId: string;
  complaints: string[];
}

interface ExpenseReport {
  convertedCount: number;
  entryCount: number;
  refusals: RowReports;
}

export class PropertyExpenseOperator extends SheetNamedBase<"propertyExpense"> {
  constructor(props: SpreadsheetNamedProps) {
    super({
      sheetName: "propertyExpense",
      ...props,
    });
  }
  static init(ss: SpreadsheetNamed): PropertyExpenseOperator {
    return new PropertyExpenseOperator(ss.spreadsheetNamedProps);
  }
  get ss(): SpreadsheetNamed {
    return new SpreadsheetNamed(this.spreadsheetNamedProps);
  }
  get sheet(): SheetNamed<"propertyExpense"> {
    return this.ss.sheet(this.sheetName);
  }
  get staging(): SheetNamed<"addPropertyExpense"> {
    return this.ss.sheet("addPropertyExpense");
  }
  add(stagingRowIndexes: number[]): ActionReturn {
    this._gatherFetchInputs();
    const stagingRows = this._entryRows(stagingRowIndexes);
    if (stagingRows.length === 0) return "There are no expenses to add.";
    const converted: StagingRow[] = [];
    const refusals: RowReports = new Map();
    stagingRows.forEach((stagingRow) => {
      const complaints = this._convert(stagingRow);
      if (complaints.length === 0) {
        converted.push(stagingRow);
      } else {
        refusals.set(stagingRow.rowIndex, refusalReport(complaints));
      }
    });
    converted.forEach((stagingRow) => stagingRow.delete());
    return this._report({
      convertedCount: converted.length,
      entryCount: stagingRows.length,
      refusals,
    });
  }
  private _gatherFetchInputs(): void {
    const { ss } = this;
    this.staging.prepFetchColumnsFull(...typedColumns);
    this._rowIdsByName("unit").prepFetch();
    ss.sheet("unit").prepFetchColumnsFull("propertyId");
    this._rowIdsByName("property").prepFetch();
    this._rowIdsByName("splitReceipt").prepFetch();
    // The append needs this sheet's column ids and table bounds, which only a prepped read brings.
    this.sheet.prepFetchColumnsFull("id");
    ss.fetchAllPrepped();
  }
  // The blank row a clean run leaves behind is a row the operator has yet to fill in.
  private _entryRows(stagingRowIndexes: number[]): StagingRow[] {
    return stagingRowIndexes
      .map((rowIndex) => this.staging.row(rowIndex))
      .filter((stagingRow) => !stagingRow.isBlank);
  }
  // Appends the expense, or names everything wrong with the row and appends nothing.
  private _convert(stagingRow: StagingRow): string[] {
    const place = this._place(stagingRow);
    const splitReceipt = this._splitReceipt(stagingRow);
    const complaints = [
      ...this._blankComplaints(stagingRow),
      ...place.complaints,
      ...splitReceipt.complaints,
    ];
    if (complaints.length > 0) return complaints;
    this.sheet.appendRowWithAllVals({
      propertyId: place.propertyId,
      unitId: place.unitId,
      splitReceiptId: splitReceipt.splitReceiptId,
      date: stagingRow.value("date"),
      billerName: stagingRow.value("billerName"),
      description: stagingRow.value("description"),
      amount: stagingRow.value("amount"),
      expenseCategory: stagingRow.value("expenseCategory"),
      receiptFormat: stagingRow.value("receiptFormat"),
      taxAdjust: stagingRow.value("taxAdjust"),
      isUpfrontInvestment: stagingRow.value("isUpfrontInvestment"),
      notes: stagingRow.value("notes"),
    });
    return [];
  }
  // The sheet's own Empty value allowed ticks are the only record of what a row must hold.
  private _blankComplaints(stagingRow: StagingRow): string[] {
    return stagingRow
      .blankRequiredColumnNames()
      .map(
        (columnName) =>
          `${stagingRow.cell(columnName).schema.trait("header")} is blank`,
      );
  }
  private _place(stagingRow: StagingRow): ExpensePlace {
    const unitName = stagingRow.value("unitName");
    const propertyName = stagingRow.value("propertyName");
    if (unitName === "") return this._placeFromProperty(propertyName);
    return this._placeFromUnit({ unitName, propertyName });
  }
  // A roof or a driveway belongs to the property and to no one unit.
  private _placeFromProperty(propertyName: string): ExpensePlace {
    if (propertyName === "") {
      return emptyPlace(["name a unit or a property"]);
    }
    const property = this._rowIdsByName("property").rowIdByName(propertyName);
    if (property.found !== "one") {
      return emptyPlace(this._nameComplaints(property, "property", propertyName));
    }
    return { propertyId: property.rowId, unitId: "", complaints: [] };
  }
  // Naming a unit states its property too, so a named property only has to agree.
  private _placeFromUnit({ unitName, propertyName }: PlaceNames): ExpensePlace {
    const property = this._propertyMatch(propertyName);
    // Gathered before the unit is judged, so one unknown name can't hide the other.
    const propertyComplaints = this._nameComplaints(
      property,
      "property",
      propertyName,
    );
    const unit = this._rowIdsByName("unit").rowIdByName(unitName);
    if (unit.found !== "one") {
      return emptyPlace([
        ...this._nameComplaints(unit, "unit", unitName),
        ...propertyComplaints,
      ]);
    }
    const propertyId = this.ss
      .sheet("unit")
      .row(unit.rowIndex)
      .value("propertyId");
    const place = { propertyId, unitId: unit.rowId };
    if (propertyComplaints.length > 0) {
      return { ...place, complaints: propertyComplaints };
    }
    if (property?.found === "one" && property.rowId !== propertyId) {
      return {
        ...place,
        complaints: [
          `unit "${unitName}" does not belong to property "${propertyName}"`,
        ],
      };
    }
    return { ...place, complaints: [] };
  }
  private _propertyMatch(propertyName: string): RowIdByName | undefined {
    if (propertyName === "") return undefined;
    return this._rowIdsByName("property").rowIdByName(propertyName);
  }
  private _splitReceipt(stagingRow: StagingRow): SplitReceiptRef {
    const name = stagingRow.value("splitReceiptName");
    if (name === "") return { splitReceiptId: "", complaints: [] };
    const receipt = this._rowIdsByName("splitReceipt").rowIdByName(name);
    if (receipt.found !== "one") {
      return {
        splitReceiptId: "",
        complaints: this._nameComplaints(receipt, "splitReceipt", name),
      };
    }
    return { splitReceiptId: receipt.rowId, complaints: [] };
  }
  // A name nobody gave is no fault of the row's; what a missing one means is decided above.
  private _nameComplaints(
    match: RowIdByName | undefined,
    sheetName: NamedSheetName,
    name: string,
  ): string[] {
    if (!match || match.found === "one") return [];
    return [this._unresolved(match, sheetName, name)];
  }
  // The live sheet title, not its config name: the operator reads this cell.
  private _unresolved(
    match: NameUnresolved,
    sheetName: NamedSheetName,
    name: string,
  ): string {
    const title = this.ss.sheet(sheetName).raw.title;
    if (match.found === "many") {
      return `${match.rowCount} rows of ${title} are named "${name}"`;
    }
    return `no row of ${title} is named "${name}"`;
  }
  private _report({
    convertedCount,
    entryCount,
    refusals,
  }: ExpenseReport): ActionReturn {
    if (refusals.size === 0) {
      return `Added ${countOfExpenses(convertedCount)}.`;
    }
    return {
      runState: "warning",
      message: `Added ${convertedCount} of ${entryCount} rows; the rest say why in their own cells.`,
      rows: refusals,
    };
  }
  private _rowIdsByName(
    sheetName: NamedSheetName,
  ): RowIdByNameOperator<NamedSheetName, "name"> {
    return new RowIdByNameOperator({
      ...this.spreadsheetNamedProps,
      sheetName,
      columnName: "name",
    });
  }
}

function emptyPlace(complaints: string[]): ExpensePlace {
  return { propertyId: "", unitId: "", complaints };
}

// Every complaint about the row, in the row's own cell, so no run has to be repeated to find the next one.
function refusalReport(complaints: string[]): RunReport {
  return {
    runState: "failure",
    message: `This row was not added: ${complaints.join("; ")}.`,
  };
}

function countOfExpenses(count: number): string {
  if (count === 1) return "1 expense";
  return `${count} expenses`;
}
