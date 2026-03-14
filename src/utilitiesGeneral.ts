import { dateU } from "./DateU";

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
  date: dateU,
  currency: _currencyUtils,
  id: _idUtils,
};
