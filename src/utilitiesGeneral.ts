const _currencyUtils = {
  format(amount: number, locale: string = "en-US", currency: string = "USD") {
    if (isNaN(amount)) {
      throw new Error("Invalid amount (NaN) provided to formatCurrency");
    }

    try {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currency,
      }).format(amount);
    } catch (error) {
      console.error(`Error formatting currency: ${error.message}`);
      return amount.toFixed(2); // Fallback to basic formatting if Intl fails
    }
  },
};

export interface MonthYear {
  month: number; // 1-12
  year: number;
}

class DateUtils {
  getDayBefore(date: Date): Date {
    const dayBefore = new Date(date.getTime());
    dayBefore.setDate(dayBefore.getDate() - 1);
    return dayBefore;
  }
  isInMonthAndYear(date: Date, month: number, year: number): boolean {
    return date.getMonth() === month && date.getFullYear() === year;
  }
  normalizedDate(date: Date) {
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);
    return normalizedDate;
  }
  isThisDateOrPassed(inputDate: Date, thisDate: Date = new Date()): boolean {
    const testDate = this.normalizedDate(thisDate);
    const normalizedInput = this.normalizedDate(inputDate);
    return normalizedInput <= testDate;
  }
  isDateAndTodayOrPassed(inputDate: unknown): inputDate is Date {
    return inputDate instanceof Date && this.isThisDateOrPassed(inputDate);
  }
  isDateAndThisDateOrAfter(
    inputDate: unknown,
    thisDate: Date = new Date(),
  ): inputDate is Date {
    return (
      inputDate instanceof Date && this.isDateSameOrAfter(inputDate, thisDate)
    );
  }
  isDateSameOrAfter(
    inputDate: Date,
    thisDate: Date = new Date(),
  ): inputDate is Date {
    const testDate = this.normalizedDate(thisDate);
    const normalizedInput = this.normalizedDate(inputDate);
    return normalizedInput >= testDate;
  }
  isDateSameOrBefore(
    inputDate: Date,
    thisDate: Date = new Date(),
  ): inputDate is Date {
    const testDate = this.normalizedDate(thisDate);
    const normalizedInput = this.normalizedDate(inputDate);
    return normalizedInput <= testDate;
  }
  isOnOrBetween(p: { date: Date; startDate: Date; endDate: Date }) {
    if (p.startDate > p.endDate) {
      throw new Error("Start date cannot be after end date.");
    }
    return (
      this.isDateSameOrAfter(p.date, p.startDate) ||
      this.isDateSameOrBefore(p.date, p.endDate)
    );
  }
  monthYear(date: Date) {
    return `${date.getMonth() + 1}/${date.getFullYear()}`;
  }
  monthYearsOnAndBetween({
    startMonthYear,
    endMonthYear,
  }: {
    startMonthYear: MonthYear;
    endMonthYear: MonthYear;
  }) {
    const monthYears: MonthYear[] = [];
    let currentMonth = startMonthYear.month;
    let currentYear = startMonthYear.year;
    while (
      currentYear < endMonthYear.year ||
      (currentYear === endMonthYear.year && currentMonth <= endMonthYear.month)
    ) {
      monthYears.push({ month: currentMonth, year: currentYear });
      currentMonth++;
      if (currentMonth > 12) {
        currentMonth = 1;
        currentYear++;
      }
    }
    return monthYears;
  }
  firstAndLastOfMonthNext(props: MonthYear): {
    firstOfMonth: Date;
    lastOfMonth: Date;
  } {
    return {
      firstOfMonth: this.firstDayOfMonthNext(props),
      lastOfMonth: this.lastDayOfMonthNext(props),
    };
  }
  firstDayOfMonthNext({ month, year }: MonthYear): Date {
    return new Date(year, month - 1, 1, 12);
  }
  lastDayOfMonthNext({ month, year }: MonthYear): Date {
    return new Date(year, month, 0, 12);
  }
  firstAndLastDayOfMonth(date: Date = new Date()): {
    firstOfMonth: Date;
    lastOfMonth: Date;
  } {
    return {
      firstOfMonth: this.firstDayOfMonth(date),
      lastOfMonth: this.lastDateOfMonth(date),
    };
  }
  firstDayOfMonth(date: Date = new Date()): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1, 12);
  }
  lastDateOfMonth(date: Date): Date {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0, 12);
  }
  incrementMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 1, 12);
  }
  proratedMonthlyProportion(p: {
    startDate: Date;
    endDate: Date;
    month: number;
    year: number;
  }): number {
    const { firstOfMonth, lastOfMonth } = this.firstAndLastOfMonthNext(p);

    const prorateStart =
      p.startDate < firstOfMonth ? firstOfMonth : p.startDate;
    const prorateEnd = p.endDate > lastOfMonth ? lastOfMonth : p.endDate;

    const daysInMonth = lastOfMonth.getDate();
    const daysCharged = prorateEnd.getDate() - prorateStart.getDate() + 1;
    return daysCharged / daysInMonth;
  }
  proratedMonthlyAmount(p: {
    amount: number;
    startDate: Date;
    endDate: Date;
    month: number;
    year: number;
  }): number {
    return this.proratedMonthlyProportion(p) * p.amount;
  }
  prorateds(p: {
    amount: number;
    startDate: Date;
    endDate: Date;
    month: number;
    year: number;
  }): {
    proratedAmount: number;
    proratedProportion: number;
    isProrated: boolean;
  } {
    const proratedProportion = this.proratedMonthlyProportion(p);
    return {
      proratedAmount: proratedProportion * p.amount,
      proratedProportion,
      isProrated: proratedProportion < 1,
    };
  }
}

const _idUtils = {
  make(prepend: string, length: number = 7) {
    const alphabet =
      "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_-";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    }
    return `${prepend}-${result}`;
  },
};

export const utils = {
  general: {},
  dateNext: new DateUtils(),
  currency: _currencyUtils,
  id: _idUtils,
};
