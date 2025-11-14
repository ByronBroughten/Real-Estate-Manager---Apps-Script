import { valS } from "./utils/validation";

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

const _dateUtils = {
  getDayBefore(date: Date) {
    const dayBefore = new Date(date.getTime());
    dayBefore.setDate(dayBefore.getDate() - 1);
    return dayBefore;
  },
  isDateAndTodayOrPassed: function (inputDate: unknown): inputDate is Date {
    return inputDate instanceof Date && this.isThisDateOrPassed(inputDate);
  },
  isDateAndThisDateOrAfter: function (
    inputDate: unknown,
    thisDate: Date = new Date()
  ): inputDate is Date {
    return (
      inputDate instanceof Date && this.isDateSameOrAfter(inputDate, thisDate)
    );
  },
  isThisDateOrPassed: function (
    inputDate: Date,
    thisDate: Date = new Date()
  ): boolean {
    const testDate = this.normalizedDate(thisDate);
    const normalizedInput = this.normalizedDate(inputDate);
    return normalizedInput <= testDate;
  },
  isDateSameOrAfter: function (
    inputDate: Date,
    thisDate: Date = new Date()
  ): inputDate is Date {
    const testDate = this.normalizedDate(thisDate);
    const normalizedInput = this.normalizedDate(inputDate);
    return normalizedInput >= testDate;
  },
  isDateSameOrBefore: function (
    inputDate: Date,
    thisDate: Date = new Date()
  ): inputDate is Date {
    const testDate = this.normalizedDate(thisDate);
    const normalizedInput = this.normalizedDate(inputDate);
    return normalizedInput <= testDate;
  },
  normalizedDate(date: Date) {
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);
    return normalizedDate;
  },
  monthYear(date: Date) {
    return `${date.getMonth() + 1}/${date.getFullYear()}`;
  },
  firstDayOfMonth(date: Date = new Date()): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1, 12);
  },
  incrementMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 1, 12);
  },
  firstDaysOfMonths(startDate: Date, endDate: Date): Date[] {
    const firstDays: Date[] = [startDate];
    let currentDate = this.firstDayOfMonth(startDate);

    while (currentDate <= endDate) {
      if (this.monthYear(currentDate) !== this.monthYear(startDate)) {
        firstDays.push(new Date(currentDate));
      }
      currentDate = this.incrementMonth(currentDate);
    }

    return firstDays;
  },
  lastDateOfMonth(date: Date): Date {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0, 12);
  },
  dateOrLastDateOfThisMonth(value, thisDate: Date = new Date()): Date {
    if (valS.is.date(value)) {
      return value;
    } else {
      utils.date.lastDateOfMonth(thisDate);
    }
  },
  prorateMonthlyAmount(
    monthlyAmount: number,
    startDate: Date,
    endDate: Date
  ): number {
    if (
      startDate.getMonth() !== endDate.getMonth() ||
      startDate.getFullYear() !== endDate.getFullYear()
    ) {
      throw new Error(
        "Start and end dates must be in the same month and year."
      );
    }
    const daysInMonth = this.lastDateOfMonth(startDate).getDate();
    const daysCharged = endDate.getDate() - startDate.getDate() + 1;
    return (monthlyAmount / daysInMonth) * daysCharged;
  },
};

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
  date: _dateUtils,
  currency: _currencyUtils,
  id: _idUtils,
};
