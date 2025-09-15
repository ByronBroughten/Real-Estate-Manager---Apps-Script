export class ValidationError extends Error {}

export const validateS = {
  objToAny(value: any, e: Error): any {
    if (this.isObjToAny(value)) return value;
    else {
      throw new ValidationError(`"${value}" is not an Object`);
    }
  },
};
