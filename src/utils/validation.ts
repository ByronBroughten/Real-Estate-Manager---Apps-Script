class ValidationError extends Error {}

export function validationError(
  value: unknown,
  notAWhat: string
): ValidationError {
  return new ValidationError(`value "${value}" is not a ${notAWhat}`);
}

const _isS = {
  string(value: unknown): value is string {
    return typeof value === "string";
  },
  stringNotEmpty(value: string): value is string {
    return value !== "";
  },
  number(value: unknown): value is number {
    return typeof value === "number";
  },
  boolean(value: unknown): value is boolean {
    return typeof value === "boolean";
  },
  date(value: unknown): value is Date {
    return value instanceof Date;
  },
};

const _validateS = {
  string(value: unknown): string {
    if (_isS.string(value)) {
      return value;
    } else {
      throw validationError(value, "string");
    }
  },
  stringNotEmpty: (value: unknown): string => {
    const str = _validateS.string(value);
    if (_isS.stringNotEmpty(str)) {
      return str;
    } else {
      throw validationError(value, "not empty string");
    }
  },
  number(value: unknown): number {
    if (_isS.number(value)) {
      return value;
    } else {
      throw validationError(value, "number");
    }
  },
  boolean(value: unknown): boolean {
    if (_isS.boolean(value)) {
      return value;
    } else {
      throw validationError(value, "boolean");
    }
  },
  date(value: unknown): Date {
    if (_isS.date(value)) {
      return value;
    } else {
      throw validationError(value, "date");
    }
  },
};

export const valS = {
  is: _isS,
  validate: _validateS,

  // isString(value)
  // objToAny(value: any, e: Error): any {
  //   if (this.isObjToAny(value)) return value;
  //   else {
  //     throw new ValidationError(`"${value}" is not an Object`);
  //   }
  // },
  // isArray(value: any): any[] {
  //   if (!Array.isArray(value)) {
  //     throw new ValidationError("The received value is not an array.");
  //   } else return value;
  // },
};
