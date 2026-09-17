import { rangeEqual } from "./ConditionalFormat";
import type { GridRangeProps } from "./RawSource";

export interface WholeSheetGridRange {
  sheetId: number;
}

export type ProtectionGridRange = GridRangeProps | WholeSheetGridRange;

export interface EditWarningDeclaration {
  description?: string;
}

export interface EditLockDeclaration {
  description?: string;
  users?: string[];
  groups?: string[];
}

export interface WholeSheetEditWarningDeclaration extends EditWarningDeclaration {
  unprotectedRanges?: ProtectionGridRange[];
}

export interface WholeSheetEditLockDeclaration extends EditLockDeclaration {
  unprotectedRanges?: ProtectionGridRange[];
}

export type ProtectedRange =
  ModelableProtectedRange | UnmodelableProtectedRange;

export interface ModelableProtectedRange {
  kind: "warning" | "lock";
  id: number;
  range: ProtectionGridRange;
  description: string;
  users: string[];
  groups: string[];
  unprotectedRanges: ProtectionGridRange[];
  requestingUserCanEdit: boolean;
}

export interface UnmodelableProtectedRange {
  kind: "unmodelable";
  id: number;
}

export type ProtectedRangeContent = Omit<
  ModelableProtectedRange,
  "id" | "requestingUserCanEdit"
>;

export function isWholeSheetGridRange(
  range: ProtectionGridRange,
): range is WholeSheetGridRange {
  return !("startRowIndex" in range);
}

export function protectionRangeHasRowCoordinates(
  range: ProtectionGridRange,
): boolean {
  return "startRowIndex" in range || "endRowIndex" in range;
}

export function protectionRangeEqual(
  left: ProtectionGridRange,
  right: ProtectionGridRange | undefined,
): boolean {
  if (right === undefined) return false;
  if (isWholeSheetGridRange(left) || isWholeSheetGridRange(right)) {
    return (
      isWholeSheetGridRange(left) &&
      isWholeSheetGridRange(right) &&
      left.sheetId === right.sheetId
    );
  }
  return rangeEqual(left, right);
}

export function protectedRangeContentsEqual(
  left: ProtectedRangeContent,
  right: ProtectedRangeContent,
): boolean {
  return (
    left.kind === right.kind &&
    protectionRangeEqual(left.range, right.range) &&
    left.description === right.description &&
    stringListsEqual(left.users, right.users) &&
    stringListsEqual(left.groups, right.groups) &&
    protectionRangesEqual(left.unprotectedRanges, right.unprotectedRanges)
  );
}

export function protectedRangesEqual(
  left: ProtectedRange,
  right: ProtectedRange,
): boolean {
  if (left.kind === "unmodelable" || right.kind === "unmodelable") return false;
  return protectedRangeContentsEqual(left, right);
}

function protectionRangesEqual(
  left: ProtectionGridRange[],
  right: ProtectionGridRange[],
): boolean {
  if (left.length !== right.length) return false;
  return left.every((range, index) =>
    protectionRangeEqual(range, right[index]),
  );
}

function stringListsEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}
