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
  makeID(length = 7) {
    const alphabet =
      "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_-";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    }
    return result;
  },
};

export const utils = {
  date: _dateUtils,
};
