import {
  isWholeColumnGridRange,
  protectedRangeContentSatisfies,
  protectedRangesEqual,
  protectionRangeEqual,
  protectionRangeHasRowCoordinates,
  type EditLockDeclaration,
  type EditWarningDeclaration,
  type ProtectedRange,
  type ProtectedRangeContent,
  type ProtectionGridRange,
  type WholeSheetEditLockDeclaration,
  type WholeSheetEditWarningDeclaration,
} from "../../00_base/RawSource/ProtectedRange";
import { SheetCommonRaw } from "../ClassBases/SheetCommonRaw";
import { SheetRaw } from "../SheetRaw";
import { SpreadsheetRaw } from "../SpreadsheetRaw";

export class SheetEditProtectionsRaw extends SheetCommonRaw {
  get ss(): SpreadsheetRaw {
    return new SpreadsheetRaw(this.spreadsheetRawProps);
  }
  get sheet(): SheetRaw {
    return new SheetRaw(this.sheetRawProps);
  }
  gatherFetchProtectedRanges(): void {
    this.sheetState.fetchQueue.gatherProtectedRanges = true;
  }
  protectedRanges(): ProtectedRange[] {
    this.assertProtectedRangesNotStale();
    const protections = this.sheetState.working.protectedRanges.ranges;
    if (protections === null) {
      throw new Error(
        `Protected ranges have not been fetched for sheetGid ${this.sheetGid}.`,
      );
    }
    return protections;
  }
  addEditWarning(declaration: EditWarningDeclaration = {}): void {
    this.addEditWarningAt(this.sheet.dataGridRange, declaration);
  }
  addEditLock(declaration: EditLockDeclaration = {}): void {
    this.addEditLockAt(this.sheet.dataGridRange, declaration);
  }
  addEditWarningWholeSheet(
    declaration: WholeSheetEditWarningDeclaration = {},
  ): void {
    this._queueProtection({
      kind: "warning",
      range: this.sheet.wholeSheetGridRange,
      description: declaration.description ?? "",
      users: [],
      groups: [],
      unprotectedRanges: declaration.unprotectedRanges ?? [],
    });
  }
  addEditLockWholeSheet(declaration: WholeSheetEditLockDeclaration = {}): void {
    this._queueProtection({
      kind: "lock",
      range: this.sheet.wholeSheetGridRange,
      description: declaration.description ?? "",
      users: declaration.users ?? [],
      groups: declaration.groups ?? [],
      unprotectedRanges: declaration.unprotectedRanges ?? [],
    });
  }
  addEditWarningAt(
    range: ProtectionGridRange,
    declaration: EditWarningDeclaration = {},
  ): void {
    this._queueProtection({
      kind: "warning",
      range,
      description: declaration.description ?? "",
      users: [],
      groups: [],
      unprotectedRanges: [],
    });
  }
  addEditLockAt(
    range: ProtectionGridRange,
    declaration: EditLockDeclaration = {},
  ): void {
    this._queueProtection({
      kind: "lock",
      range,
      description: declaration.description ?? "",
      users: declaration.users ?? [],
      groups: declaration.groups ?? [],
      unprotectedRanges: [],
    });
  }
  private _queueProtection(protection: ProtectedRangeContent): void {
    this._assertProtectionWriteCoordinatesNotStale(
      protection.range,
      protection.unprotectedRanges,
    );
    this.assertProtectedRangesNotStale();
    if (
      this._pendingProtectedRangeContents().some((pending) =>
        protectedRangeContentSatisfies(pending, protection),
      )
    ) {
      return;
    }
    this.updateRequests.addProtectedRange.push({
      kind: "addProtectedRange",
      protection,
    });
  }
  private _pendingProtectedRangeContents(): ProtectedRangeContent[] {
    const fetched = this.sheetState.working.protectedRanges.ranges;
    const protections: ProtectedRange[] = fetched === null ? [] : [...fetched];
    const deletedIds = new Set(
      this.updateRequests.deleteProtectedRange
        .filter((operation) => operation.sheetId === this.sheetGid)
        .map((operation) => operation.protectedRangeId),
    );
    const remaining = protections.filter(
      (protection) => !deletedIds.has(protection.id),
    );
    const queued = this.updateRequests.addProtectedRange
      .filter(
        (operation) => operation.protection.range.sheetId === this.sheetGid,
      )
      .map((operation) => operation.protection);
    return [
      ...remaining.flatMap((protection) =>
        protection.kind === "unmodelable" ? [] : [protection],
      ),
      ...queued,
    ];
  }
  removeEditProtections(): void {
    this.removeEditProtectionsAt(this.sheet.dataGridRange);
  }
  removeEditProtectionsAt(range: ProtectionGridRange): void {
    this._assertProtectionWriteCoordinatesNotStale(range, []);
    this.assertProtectedRangesNotStale();
    this.protectedRanges().forEach((protection) => {
      if (protection.kind === "unmodelable") return;
      if (!protectionRangeEqual(range, protection.range)) return;
      this._queueDeleteProtectedRange(protection.id);
    });
  }
  removeEditProtection(protection: ProtectedRange): void {
    this._removeProtectionsWhere((existing) =>
      protectedRangesEqual(existing, protection),
    );
  }
  removeEditProtectionByDescription(description: string): void {
    this._removeProtectionsWhere(
      (existing) =>
        existing.kind !== "unmodelable" && existing.description === description,
    );
  }
  removeEditProtectionById(protectedRangeId: number): void {
    this._removeProtectionsWhere(
      (existing) => existing.id === protectedRangeId,
    );
  }
  private _removeProtectionsWhere(
    matches: (protection: ProtectedRange) => boolean,
  ): void {
    this.assertProtectedRangesNotStale();
    this.protectedRanges().forEach((existing) => {
      if (!matches(existing)) return;
      if (existing.kind !== "unmodelable") {
        this._assertProtectionWriteCoordinatesNotStale(
          existing.range,
          existing.unprotectedRanges,
        );
      }
      this._queueDeleteProtectedRange(existing.id);
    });
  }
  private _queueDeleteProtectedRange(protectedRangeId: number): void {
    this.updateRequests.deleteProtectedRange.push({
      kind: "deleteProtectedRange",
      sheetId: this.sheetGid,
      protectedRangeId,
    });
  }
  private _assertProtectionWriteCoordinatesNotStale(
    range: ProtectionGridRange,
    unprotectedRanges: ProtectionGridRange[],
  ): void {
    [range, ...unprotectedRanges].forEach((item) => {
      this._assertOneProtectionRangeCoordinatesNotStale(item);
    });
  }
  private _assertOneProtectionRangeCoordinatesNotStale(
    range: ProtectionGridRange,
  ): void {
    if (isWholeColumnGridRange(range)) {
      if (this.sheetState.working.knownTable !== null) {
        this.activeTable.validateColIndexNotStale(range.startColumnIndex);
      }
      return;
    }
    if (!protectionRangeHasRowCoordinates(range)) return;
    this.activeTable.assertRowIndexesNotStale();
  }
  markProtectedRangesStale(): void {
    this.sheetState.working.protectedRanges.isStale = true;
  }
  assertProtectedRangesNotStale(): void {
    if (!this.sheetState.working.protectedRanges.isStale) return;
    throw new Error(
      `Protections are stale for sheetGid ${this.sheetGid}. Re-fetch the sheet's protections before reading or mutating them again.`,
    );
  }
  integrateProtectedRanges(protections: ProtectedRange[]): void {
    this.sheetState.working.protectedRanges.ranges = protections;
    this.sheetState.fetchQueue.gatherProtectedRanges = false;
    this.sheetState.working.protectedRanges.isStale = false;
  }
}
