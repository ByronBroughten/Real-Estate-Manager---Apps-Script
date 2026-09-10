declare const dateSerial: unique symbol;
// A whole-day Sheets serial. Branded so a rent or a count can't be a date.
export type DateSerial = number & { readonly [dateSerial]: true };

export interface MonthYear {
  month: number; // 1-12
  year: number;
}

export interface Ymd extends MonthYear {
  day: number;
}

export interface DateRange {
  startDate: DateSerial;
  endDate: DateSerial;
}

export interface DateInRange extends DateRange {
  date: DateSerial;
}

export interface MonthYearRange {
  startMonthYear: MonthYear;
  endMonthYear: MonthYear;
}

export interface FirstAndLastOfMonth {
  firstOfMonth: DateSerial;
  lastOfMonth: DateSerial;
}

export interface MonthRange extends MonthYear, DateRange {}

// A guard and its throwing form, outside the bundle so `this` can't swallow the narrowing.
function isSerial(value: unknown): value is DateSerial {
  return typeof value === "number" && Number.isInteger(value);
}

function validate(value: unknown): DateSerial {
  if (isSerial(value)) {
    return value;
  }
  throw new Error(`value "${String(value)}" is not a whole-day date serial`);
}

export const Dat = {
  SHEET_TIMEZONE: "America/Chicago",
  SHEETS_EPOCH_UTC_MS: Date.UTC(1899, 11, 30), // Dec 30, 1899, 00:00 UTC
  MS_PER_DAY: 86400000,
  isSerial,
  validate,
  today(): DateSerial {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: this.SHEET_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(new Date())
      .reduce<Record<string, string>>((acc, part) => {
        acc[part.type] = part.value;
        return acc;
      }, {});
    return this.fromYmd({
      year: Number(parts.year),
      month: Number(parts.month),
      day: Number(parts.day),
    });
  },
  fromYmd({ year, month, day }: Ymd): DateSerial {
    const utcMs = this._utcMsFromYmd({ year, month, day });
    const serial = (utcMs - this.SHEETS_EPOCH_UTC_MS) / this.MS_PER_DAY;
    if (!isSerial(serial)) {
      throw new Error(`${year}-${month}-${day} is not a real date.`);
    }
    return serial;
  },
  toYmd(date: DateSerial): Ymd {
    const utc = new Date(
      this.SHEETS_EPOCH_UTC_MS + validate(date) * this.MS_PER_DAY,
    );
    return {
      year: utc.getUTCFullYear(),
      month: utc.getUTCMonth() + 1,
      day: utc.getUTCDate(),
    };
  },
  addDays(date: DateSerial, days: number): DateSerial {
    return validate(validate(date) + days);
  },
  dayBefore(date: DateSerial): DateSerial {
    return this.addDays(date, -1);
  },
  addMonths(date: DateSerial, months: number): DateSerial {
    const { year, month, day } = this.toYmd(date);
    const monthCount = year * 12 + (month - 1) + months;
    const target = {
      month: (((monthCount % 12) + 12) % 12) + 1,
      year: Math.floor(monthCount / 12),
    };
    return this.fromYmd({
      ...target,
      day: Math.min(day, this._daysInMonthYear(target)),
    });
  },
  isSameOrAfter(
    date: DateSerial,
    referenceDate: DateSerial = this.today(),
  ): boolean {
    return validate(date) >= validate(referenceDate);
  },
  isSameOrBefore(
    date: DateSerial,
    referenceDate: DateSerial = this.today(),
  ): boolean {
    return validate(date) <= validate(referenceDate);
  },
  isTodayOrPassed(date: DateSerial): boolean {
    return this.isSameOrBefore(date);
  },
  isOnOrBetween({ date, startDate, endDate }: DateInRange): boolean {
    if (validate(startDate) > validate(endDate)) {
      throw new Error("Start date cannot be after end date.");
    }
    return (
      this.isSameOrAfter(date, startDate) && this.isSameOrBefore(date, endDate)
    );
  },
  monthYear(date: DateSerial): MonthYear {
    const { month, year } = this.toYmd(date);
    return { month, year };
  },
  isInMonthAndYear(date: DateSerial, { month, year }: MonthYear): boolean {
    const dateMonthYear = this.monthYear(date);
    return dateMonthYear.month === month && dateMonthYear.year === year;
  },
  monthYearsOnAndBetween({
    startMonthYear,
    endMonthYear,
  }: MonthYearRange): MonthYear[] {
    const monthYears: MonthYear[] = [];
    let current = startMonthYear;
    while (
      current.year < endMonthYear.year ||
      (current.year === endMonthYear.year &&
        current.month <= endMonthYear.month)
    ) {
      monthYears.push(current);
      current = this._nextMonthYear(current);
    }
    return monthYears;
  },
  firstDayOfMonth(date: DateSerial): DateSerial {
    return this.firstDayOfMonthYear(this.monthYear(date));
  },
  lastDayOfMonth(date: DateSerial): DateSerial {
    return this.lastDayOfMonthYear(this.monthYear(date));
  },
  firstAndLastDayOfMonth(date: DateSerial): FirstAndLastOfMonth {
    return this.firstAndLastDayOfMonthYear(this.monthYear(date));
  },
  firstDayOfNextMonth(date: DateSerial): DateSerial {
    return this.firstDayOfMonthYear(this._nextMonthYear(this.monthYear(date)));
  },
  firstDayOfMonthYear({ month, year }: MonthYear): DateSerial {
    return this.fromYmd({ month, year, day: 1 });
  },
  lastDayOfMonthYear(monthYear: MonthYear): DateSerial {
    return this.dayBefore(
      this.firstDayOfMonthYear(this._nextMonthYear(monthYear)),
    );
  },
  firstAndLastDayOfMonthYear(monthYear: MonthYear): FirstAndLastOfMonth {
    return {
      firstOfMonth: this.firstDayOfMonthYear(monthYear),
      lastOfMonth: this.lastDayOfMonthYear(monthYear),
    };
  },
  monthRanges(term: DateRange): MonthRange[] {
    this._validateDateOrder(term);
    return this.monthYearsOnAndBetween({
      startMonthYear: this.monthYear(term.startDate),
      endMonthYear: this.monthYear(term.endDate),
      // Annotated because `this` can't infer the callback's param inside the bundle.
    }).map((monthYear: MonthYear) => {
      const { firstOfMonth, lastOfMonth } =
        this.firstAndLastDayOfMonthYear(monthYear);
      return {
        ...monthYear,
        startDate: validate(Math.max(term.startDate, firstOfMonth)),
        endDate: validate(Math.min(term.endDate, lastOfMonth)),
      };
    });
  },
  proratedMonthlyProportion(range: DateRange): number {
    const monthYear = this._validateSingleMonth(range);
    return (
      (range.endDate - range.startDate + 1) / this._daysInMonthYear(monthYear)
    );
  },
  proratedMonthlyAmount(amount: number, range: DateRange): number {
    return this.proratedMonthlyProportion(range) * amount;
  },
  _validateDateOrder({ startDate, endDate }: DateRange): void {
    if (validate(startDate) > validate(endDate)) {
      throw new Error("Start date cannot be after end date.");
    }
  },
  // Hands back the month it proved, so the caller doesn't derive it twice.
  _validateSingleMonth(range: DateRange): MonthYear {
    this._validateDateOrder(range);
    const start = this.monthYear(range.startDate);
    const end = this.monthYear(range.endDate);
    if (start.month !== end.month || start.year !== end.year) {
      throw new Error(
        `A prorated range must lie in one month, but ${start.year}-${start.month} and ${end.year}-${end.month} differ.`,
      );
    }
    return start;
  },
  _nextMonthYear({ month, year }: MonthYear): MonthYear {
    if (month === 12) {
      return { month: 1, year: year + 1 };
    }
    return { month: month + 1, year };
  },
  _daysInMonthYear(monthYear: MonthYear): number {
    const { firstOfMonth, lastOfMonth } =
      this.firstAndLastDayOfMonthYear(monthYear);
    return lastOfMonth - firstOfMonth + 1;
  },
  // NaN when the calendar has no such day, so fromYmd throws instead of overflowing.
  _utcMsFromYmd({ year, month, day }: Ymd): number {
    if (![year, month, day].every((part) => Number.isInteger(part))) {
      return NaN;
    }
    const utc = new Date(0);
    utc.setUTCFullYear(year, month - 1, day);
    utc.setUTCHours(0, 0, 0, 0);
    if (
      utc.getUTCFullYear() !== year ||
      utc.getUTCMonth() !== month - 1 ||
      utc.getUTCDate() !== day
    ) {
      return NaN;
    }
    return utc.getTime();
  },
};
