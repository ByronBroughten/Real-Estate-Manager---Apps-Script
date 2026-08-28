import { vi } from "vitest";

export interface FakeScriptProperties {
  getProperty(key: string): string | null;
  setProperty(key: string, value: string): void;
}

/** Stubs the `Logger` global as a no-op spy, so production `Logger.log(...)` calls don't crash under Node. */
export function stubLogger(): { log: ReturnType<typeof vi.fn> } {
  const logger = { log: vi.fn() };
  vi.stubGlobal("Logger", logger);
  return logger;
}

/** Stubs the `PropertiesService` global with an in-memory script-properties store. */
export function stubPropertiesService(
  initialProperties: Record<string, string> = {},
): FakeScriptProperties {
  const store = new Map(Object.entries(initialProperties));
  const scriptProperties: FakeScriptProperties = {
    getProperty: (key) => store.get(key) ?? null,
    setProperty: (key, value) => {
      store.set(key, value);
    },
  };
  vi.stubGlobal("PropertiesService", {
    getScriptProperties: () => scriptProperties,
  });
  return scriptProperties;
}

export type FakeTriggerKind = "onEdit" | "monthDay" | "everyMinutes";

export interface FakeTrigger {
  handlerFunction: string;
  kind: FakeTriggerKind;
  detail?: number;
}

/**
 * Stubs `ScriptApp` and `SpreadsheetApp` with just enough of a fluent trigger
 * builder to cover AppsScript.trigger's usage. Created triggers are tracked
 * in the returned array so tests can assert on what was scheduled/deleted.
 */
export function stubScriptAndSpreadsheetApp(): { triggers: FakeTrigger[] } {
  const triggers: FakeTrigger[] = [];

  function record(trigger: FakeTrigger): FakeTrigger {
    triggers.push(trigger);
    return trigger;
  }

  function newTrigger(handlerFunction: string) {
    return {
      forSpreadsheet: (_spreadsheet: unknown) => ({
        onEdit: () => ({
          create: () => record({ handlerFunction, kind: "onEdit" }),
        }),
      }),
      timeBased: () => ({
        onMonthDay: (day: number) => ({
          create: () =>
            record({ handlerFunction, kind: "monthDay", detail: day }),
        }),
        everyMinutes: (minutes: number) => ({
          create: () =>
            record({
              handlerFunction,
              kind: "everyMinutes",
              detail: minutes,
            }),
        }),
      }),
    };
  }

  vi.stubGlobal("ScriptApp", {
    newTrigger,
    getProjectTriggers: () => [...triggers],
    deleteTrigger: (trigger: FakeTrigger) => {
      const index = triggers.indexOf(trigger);
      if (index !== -1) triggers.splice(index, 1);
    },
  });
  vi.stubGlobal("SpreadsheetApp", {
    getActive: () => ({}),
  });

  return { triggers };
}
