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
  id: _idUtils,
};
