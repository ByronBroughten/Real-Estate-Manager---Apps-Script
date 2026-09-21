import { describe, expect, it } from "vitest";
import {
  stubPropertiesService,
  stubScriptAndSpreadsheetApp,
} from "../../testSupport/fakeAppsScriptGlobals";
import { AppsScript } from "./AppsScript";

describe("AppsScript.projectProperties", () => {
  it("reads a value from script properties", () => {
    stubPropertiesService({ realEstateSpreadsheetId: "abc123" });
    expect(AppsScript.projectProperties("realEstateSpreadsheetId")).toBe(
      "abc123",
    );
  });

  it("returns null for a missing key", () => {
    stubPropertiesService({});
    expect(AppsScript.projectProperties("missingKey")).toBeNull();
  });
});

describe("AppsScript.trigger", () => {
  it("addOnEdit schedules an onEdit trigger for the given function", () => {
    const { triggers } = stubScriptAndSpreadsheetApp();
    AppsScript.trigger.addOnEdit("triggerOnEdit");
    expect(triggers).toEqual([
      { handlerFunction: "triggerOnEdit", kind: "onEdit" },
    ]);
  });

  it("addOnChange schedules an onChange trigger for the given function, alongside the existing triggers", () => {
    const { triggers } = stubScriptAndSpreadsheetApp();
    AppsScript.trigger.addOnEdit("triggerOnEdit");
    AppsScript.trigger.addOnChange("triggerOnChange");
    expect(triggers).toEqual([
      { handlerFunction: "triggerOnEdit", kind: "onEdit" },
      { handlerFunction: "triggerOnChange", kind: "onChange" },
    ]);
  });

  it("addFirstOfMonth schedules a month-day-1 trigger", () => {
    const { triggers } = stubScriptAndSpreadsheetApp();
    AppsScript.trigger.addFirstOfMonth("monthlyJob");
    expect(triggers).toEqual([
      { handlerFunction: "monthlyJob", kind: "monthDay", detail: 1 },
    ]);
  });

  it("addEveryMinute schedules a 1-minute recurring trigger", () => {
    const { triggers } = stubScriptAndSpreadsheetApp();
    AppsScript.trigger.addEveryMinute("everyMinuteJob");
    expect(triggers).toEqual([
      { handlerFunction: "everyMinuteJob", kind: "everyMinutes", detail: 1 },
    ]);
  });

  it("deleteAllTriggers removes every currently scheduled trigger", () => {
    const { triggers } = stubScriptAndSpreadsheetApp();
    AppsScript.trigger.addOnEdit("a");
    AppsScript.trigger.addFirstOfMonth("b");
    expect(triggers).toHaveLength(2);

    AppsScript.trigger.deleteAllTriggers();
    expect(triggers).toHaveLength(0);
  });
});

describe("AppsScript.toast", () => {
  it("shows the message on the active spreadsheet", () => {
    const { toasts } = stubScriptAndSpreadsheetApp();
    AppsScript.toast("Value Config was deleted.");
    expect(toasts).toEqual(["Value Config was deleted."]);
  });
});
