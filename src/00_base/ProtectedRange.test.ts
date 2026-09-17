import { describe, it } from "vitest";
import {
  assertNotType,
  assertType,
  type IsExactly,
} from "../testSupport/typeAssertions";
import type {
  EditLockDeclaration,
  EditWarningDeclaration,
  WholeSheetEditLockDeclaration,
  WholeSheetEditWarningDeclaration,
} from "./ProtectedRange";

type HasUnprotectedRanges<T> = "unprotectedRanges" extends keyof T
  ? true
  : false;

describe("ProtectedRange identity", () => {
  it("makes unprotected ranges unrepresentable on a non-whole-sheet declaration", () => {
    assertType<IsExactly<HasUnprotectedRanges<EditWarningDeclaration>, false>>(
      true,
    );
    assertType<IsExactly<HasUnprotectedRanges<EditLockDeclaration>, false>>(
      true,
    );
    assertType<
      IsExactly<HasUnprotectedRanges<WholeSheetEditWarningDeclaration>, true>
    >(true);
    assertType<
      IsExactly<HasUnprotectedRanges<WholeSheetEditLockDeclaration>, true>
    >(true);
    assertNotType<
      IsExactly<EditWarningDeclaration, WholeSheetEditWarningDeclaration>
    >(false);
  });
});
