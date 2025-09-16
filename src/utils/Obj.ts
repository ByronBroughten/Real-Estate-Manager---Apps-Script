import { merge } from "./Obj/merge";
import { spread } from "./Obj/spread";

export type StrictOmit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type DistributiveOmit<T, K extends keyof T> = T extends any
  ? Omit<T, K>
  : never;

export type StrictPick<T, K extends keyof T> = Pick<T, K>;
export type StrictPickPartial<T, K extends keyof T> = Partial<Pick<T, K>>;
export type StrictOmitPartial<T, K extends keyof T> = Partial<Omit<T, K>>;

type Keys<T> = [keyof T];
type Values<T> = [T[keyof T]];
type Entries<O extends object> = { [K in keyof O]: [K, O[K]] }[keyof O][];

export type Full<O extends object> = {
  [K in keyof O]-?: O[K];
};

type FlagKeys<Obj, Condition> = {
  [Key in keyof Obj]: Obj[Key] extends Condition ? Key : never;
};
type AllowedKeys<Obj, Condition> = FlagKeys<Obj, Condition>[keyof Obj];
export type SubType<Base, Condition> = Pick<Base, AllowedKeys<Base, Condition>>;

export type PropKeyOfValue<
  O extends object,
  V extends O[keyof O]
> = keyof SubType<O, V>;

export const Obj = {
  isEmpty(obj: any): boolean {
    return Object.keys(obj).length === 0;
  },
  isKey<O extends Record<string, any>>(obj: O, value: any): value is keyof O {
    return this.keys(obj).includes(value);
  },
  stringifyEqual(a: any, b: any): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
  },
  isObjToAny(value: any): value is any {
    if (value && typeof value === "object") return true;
    else return false;
  },
  isObjToRecord(value: any): value is Record<string, any> {
    if (value && typeof value === "object") return true;
    else return false;
  },
  strictPick<O extends object, KS extends keyof O>(
    obj: O,
    keys: KS[]
  ): StrictPick<O, KS> {
    return keys.reduce((objNext, key) => {
      if (key in obj) {
        objNext[key] = obj[key];
      } else {
        throw new Error(`Key ${String(key)} not in object`);
      }
      return objNext;
    }, {} as StrictPick<O, KS>);
  },
  keys<O extends object>(obj: O): Keys<O> {
    return Object.keys(obj) as any;
  },
  keysDepreciated<O extends object>(obj: O): (keyof O & string)[] {
    return Object.keys(obj) as any;
  },
  values<T extends object>(t: T): Values<Full<T>> {
    return Object.values(t) as any;
  },
  entries<O extends object>(obj: O): Entries<Full<O>> {
    return Object.entries(obj) as any;
  },
  propKeysOfValue<O extends object, V extends O[keyof O]>(
    obj: O,
    value: V
  ): PropKeyOfValue<O, V>[] {
    const keys = this.keys(obj).filter((key) => obj[key] === value);
    return keys as PropKeyOfValue<O, V>[];
  },
  merge,
  spread,
} as const;
