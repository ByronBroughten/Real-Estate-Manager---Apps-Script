import { afterEach, describe, expect, it, vi } from "vitest";
import { Dat, type DateSerial } from "./Dat";

function ymd(year: number, month: number, day: number): DateSerial {
  return Dat.fromYmd({ year, month, day });
}

describe("Dat.validate", () => {
  it("returns the serial it was given for a whole number of days", () => {
    expect(Dat.validate(45292)).toBe(45292);
    expect(Dat.validate(0)).toBe(0);
    expect(Dat.validate(-1)).toBe(-1);
  });

  it("throws for a serial carrying a time of day", () => {
    expect(() => Dat.validate(45292.5)).toThrowError(/whole-day/);
  });

  it("throws for a non-number, NaN, or an infinity", () => {
    expect(() => Dat.validate("45292")).toThrowError(/whole-day/);
    expect(() => Dat.validate(NaN)).toThrowError(/whole-day/);
    expect(() => Dat.validate(Infinity)).toThrowError(/whole-day/);
    expect(() => Dat.validate(new Date())).toThrowError(/whole-day/);
  });
});

describe("Dat.isSerial", () => {
  it("narrows a whole number and rejects everything else", () => {
    expect(Dat.isSerial(45292)).toBe(true);
    expect(Dat.isSerial(45292.5)).toBe(false);
    expect(Dat.isSerial("45292")).toBe(false);
    expect(Dat.isSerial(new Date())).toBe(false);
  });
});

describe("Dat.fromYmd / Dat.toYmd", () => {
  it("counts days from the Sheets epoch", () => {
    expect(ymd(1899, 12, 30)).toBe(0);
    expect(ymd(1970, 1, 1)).toBe(25569);
  });

  it("round-trips a civil date, with the month as 1-12", () => {
    expect(Dat.toYmd(ymd(2024, 1, 31))).toEqual({
      year: 2024,
      month: 1,
      day: 31,
    });
    expect(Dat.toYmd(ymd(2024, 12, 1))).toEqual({
      year: 2024,
      month: 12,
      day: 1,
    });
  });

  it("throws on a day that does not exist rather than overflowing", () => {
    expect(() => ymd(2023, 2, 29)).toThrowError(/2023-2-29/);
    expect(() => ymd(2024, 4, 31)).toThrowError(/not a real date/);
    expect(() => ymd(2024, 0, 1)).toThrowError(/not a real date/);
    expect(() => ymd(2024, 13, 1)).toThrowError(/not a real date/);
    expect(() => ymd(2024, 1, 0)).toThrowError(/not a real date/);
  });

  it("throws on a non-integer part", () => {
    expect(() => ymd(2024, 1, 1.5)).toThrowError(/not a real date/);
  });

  it("accepts 29 February in a leap year", () => {
    expect(Dat.toYmd(ymd(2024, 2, 29)).day).toBe(29);
  });
});

describe("Dat.today", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("is the civil day in the spreadsheet timezone, not in UTC", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-03-15T02:30:00Z"));

    expect(Dat.today()).toBe(ymd(2024, 3, 14));
  });

  it("is a whole-day serial", () => {
    expect(Number.isInteger(Dat.today())).toBe(true);
  });
});

describe("Dat.addDays / Dat.dayBefore", () => {
  it("adds whole days as integer arithmetic", () => {
    const start = ymd(2024, 2, 28);

    expect(Dat.addDays(start, 1)).toBe(start + 1);
    expect(Dat.addDays(start, 2)).toBe(ymd(2024, 3, 1));
    expect(Dat.addDays(start, -28)).toBe(ymd(2024, 1, 31));
  });

  it("names the day before a start date", () => {
    expect(Dat.dayBefore(ymd(2024, 3, 1))).toBe(ymd(2024, 2, 29));
  });
});

describe("Dat.addMonths", () => {
  it("keeps the day of month when the target month has it", () => {
    expect(Dat.addMonths(ymd(2024, 1, 15), 1)).toBe(ymd(2024, 2, 15));
    expect(Dat.addMonths(ymd(2024, 1, 15), 12)).toBe(ymd(2025, 1, 15));
    expect(Dat.addMonths(ymd(2024, 3, 15), -3)).toBe(ymd(2023, 12, 15));
  });

  it("clips to the last day of the target month instead of overflowing", () => {
    expect(Dat.addMonths(ymd(2024, 1, 31), 1)).toBe(ymd(2024, 2, 29));
    expect(Dat.addMonths(ymd(2023, 1, 31), 1)).toBe(ymd(2023, 2, 28));
    expect(Dat.addMonths(ymd(2024, 5, 31), 1)).toBe(ymd(2024, 6, 30));
  });
});

describe("Dat.isSameOrAfter / isSameOrBefore / isTodayOrPassed", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("counts the same day as both same-or-after and same-or-before", () => {
    const date = ymd(2024, 6, 1);

    expect(Dat.isSameOrAfter(date, date)).toBe(true);
    expect(Dat.isSameOrBefore(date, date)).toBe(true);
    expect(Dat.isSameOrAfter(date, ymd(2024, 5, 31))).toBe(true);
    expect(Dat.isSameOrBefore(date, ymd(2024, 5, 31))).toBe(false);
  });

  it("treats today as passed", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-01T12:00:00Z"));

    expect(Dat.isTodayOrPassed(ymd(2024, 6, 1))).toBe(true);
    expect(Dat.isTodayOrPassed(ymd(2024, 5, 31))).toBe(true);
    expect(Dat.isTodayOrPassed(ymd(2024, 6, 2))).toBe(false);
  });
});

describe("Dat.isOnOrBetween", () => {
  const startDate = ymd(2024, 6, 1);
  const endDate = ymd(2024, 6, 30);

  it("includes both ends of the window", () => {
    expect(Dat.isOnOrBetween({ date: startDate, startDate, endDate })).toBe(
      true,
    );
    expect(Dat.isOnOrBetween({ date: endDate, startDate, endDate })).toBe(true);
    expect(
      Dat.isOnOrBetween({ date: ymd(2024, 6, 15), startDate, endDate }),
    ).toBe(true);
  });

  it("excludes a date outside the window on either side", () => {
    expect(
      Dat.isOnOrBetween({ date: ymd(2024, 5, 31), startDate, endDate }),
    ).toBe(false);
    expect(
      Dat.isOnOrBetween({ date: ymd(2024, 7, 1), startDate, endDate }),
    ).toBe(false);
  });

  it("throws when the start is after the end", () => {
    expect(() =>
      Dat.isOnOrBetween({
        date: startDate,
        startDate: endDate,
        endDate: startDate,
      }),
    ).toThrowError(/after end date/);
  });
});

describe("Dat.monthYear / isInMonthAndYear / monthYearsOnAndBetween", () => {
  it("reads January as month 1", () => {
    expect(Dat.monthYear(ymd(2024, 1, 15))).toEqual({ month: 1, year: 2024 });
  });

  it("counts a date as in its own month and year", () => {
    const date = ymd(2024, 1, 15);

    expect(Dat.isInMonthAndYear(date, { month: 1, year: 2024 })).toBe(true);
    expect(Dat.isInMonthAndYear(date, { month: 2, year: 2024 })).toBe(false);
    expect(Dat.isInMonthAndYear(date, { month: 1, year: 2025 })).toBe(false);
  });

  it("walks every month from the start through the end, inclusive", () => {
    expect(
      Dat.monthYearsOnAndBetween({
        startMonthYear: { month: 11, year: 2023 },
        endMonthYear: { month: 2, year: 2024 },
      }),
    ).toEqual([
      { month: 11, year: 2023 },
      { month: 12, year: 2023 },
      { month: 1, year: 2024 },
      { month: 2, year: 2024 },
    ]);
  });
});

describe("Dat month bounds", () => {
  it("takes a serial for firstDayOfMonth and lastDayOfMonth", () => {
    const date = ymd(2024, 2, 15);

    expect(Dat.firstDayOfMonth(date)).toBe(ymd(2024, 2, 1));
    expect(Dat.lastDayOfMonth(date)).toBe(ymd(2024, 2, 29));
    expect(Dat.firstAndLastDayOfMonth(date)).toEqual({
      firstOfMonth: ymd(2024, 2, 1),
      lastOfMonth: ymd(2024, 2, 29),
    });
  });

  it("takes a month and year for the MonthYear forms", () => {
    const monthYear = { month: 2, year: 2023 };

    expect(Dat.firstDayOfMonthYear(monthYear)).toBe(ymd(2023, 2, 1));
    expect(Dat.lastDayOfMonthYear(monthYear)).toBe(ymd(2023, 2, 28));
    expect(Dat.firstAndLastDayOfMonthYear(monthYear)).toEqual({
      firstOfMonth: ymd(2023, 2, 1),
      lastOfMonth: ymd(2023, 2, 28),
    });
  });

  it("gives the first day of the following month, unlike the other two", () => {
    const date = ymd(2024, 12, 31);

    expect(Dat.firstDayOfNextMonth(date)).toBe(ymd(2025, 1, 1));
    expect(Dat.firstDayOfMonth(date)).toBe(ymd(2024, 12, 1));
    expect(Dat.firstDayOfMonthYear({ month: 12, year: 2024 })).toBe(
      ymd(2024, 12, 1),
    );
    expect(Dat.addMonths(date, 1)).toBe(ymd(2025, 1, 31));
  });
});

describe("Dat prorating", () => {
  it("charges a whole month when the term covers it", () => {
    expect(
      Dat.prorateds({
        amount: 1000,
        startDate: ymd(2023, 12, 1),
        endDate: ymd(2024, 3, 31),
        month: 1,
        year: 2024,
      }),
    ).toEqual({
      proratedAmount: 1000,
      proratedProportion: 1,
      isProrated: false,
    });
  });

  it("counts calendar days when the term starts mid-month", () => {
    const proportion = Dat.proratedMonthlyProportion({
      startDate: ymd(2024, 1, 16),
      endDate: ymd(2024, 6, 30),
      month: 1,
      year: 2024,
    });

    expect(proportion).toBe(16 / 31);
    expect(
      Dat.proratedMonthlyAmount({
        amount: 3100,
        startDate: ymd(2024, 1, 16),
        endDate: ymd(2024, 6, 30),
        month: 1,
        year: 2024,
      }),
    ).toBe((3100 * 16) / 31);
  });

  it("charges nothing for a month the term does not reach", () => {
    expect(
      Dat.prorateds({
        amount: 1000,
        startDate: ymd(2024, 1, 1),
        endDate: ymd(2024, 1, 31),
        month: 3,
        year: 2024,
      }),
    ).toEqual({
      proratedAmount: 0,
      proratedProportion: 0,
      isProrated: true,
    });
  });

  it("counts calendar days when the term ends mid-month", () => {
    expect(
      Dat.proratedMonthlyProportion({
        startDate: ymd(2023, 1, 1),
        endDate: ymd(2024, 2, 15),
        month: 2,
        year: 2024,
      }),
    ).toBe(15 / 29);
  });
});
