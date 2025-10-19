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
  isTodayOrAfter: function (inputDate: Date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const normalizedInputDate = new Date(inputDate);
    normalizedInputDate.setHours(0, 0, 0, 0);

    return normalizedInputDate >= today;
  },
  isTodayOrPassed: function (inputDate: Date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const normalizedInputDate = new Date(inputDate);
    normalizedInputDate.setHours(0, 0, 0, 0);

    return normalizedInputDate <= today;
  },
  startDatesOfMonths(startDate: Date, endDate: Date) {
    const startMonth = startDate.getMonth();
    const endMonth = endDate.getMonth();
    const startYear = startDate.getFullYear();
    const months: Date[] = [new Date(startDate)];
    for (let i = startMonth; i <= endMonth; i++) {
      const month = new Date(startYear, i, 1);
      months.push(month);
    }
    return months;
  },
  lastDateOfMonth(date: Date): Date {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0);
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
  date: _dateUtils,
  currency: _currencyUtils,
  id: _idUtils,
};
