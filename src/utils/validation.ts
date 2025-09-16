class ValidationError extends Error {}

export const validateS = {
  objToAny(value: any, e: Error): any {
    if (this.isObjToAny(value)) return value;
    else {
      throw new ValidationError(`"${value}" is not an Object`);
    }
  },
  isArray(value: any): any[] {
    if (!Array.isArray(value)) {
      throw new ValidationError("The received value is not an array.");
    } else return value;
  },
};
