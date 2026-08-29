import { merge } from "./Obj/merge";
import { spread } from "./Obj/spread";
import { Str, type RemoveFirstN, type TextJoin } from "./Str";
import { Val, type PureValue, type PureValueName } from "./Val";

export type StrictOmit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type DistributiveOmit<T, K extends keyof T> = T extends any
  ? Omit<T, K>
  : never;

export type StrictPick<T, K extends keyof T> = Pick<T, K>;
export type StrictPickPartial<T, K extends keyof T> = Partial<Pick<T, K>>;
export type StrictOmitPartial<T, K extends keyof T> = Partial<Omit<T, K>>;
export type PickStartsWith<T extends object, S extends string> = {
  [K in keyof T as K extends `${S}${infer R}` ? K : never]: T[K];
};

type UnionToIntersection<U> = (
  U extends unknown ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;

// Computes the flattened type: for each outer key, remap its inner keys to "outer.inner"
type FlattenTwoLevels<
  T extends Record<string, Record<string, unknown>>,
  D extends string,
> = UnionToIntersection<
  {
    [K1 in keyof T]: {
      [K2 in keyof T[K1] as TextJoin<K1 & string, K2 & string, D>]: T[K1][K2];
    };
  }[keyof T]
>;

function flattenTwoLevels<
  T extends Record<string, Record<string, unknown>>,
  D extends string,
>(obj: T, keyDelimiter: D): FlattenTwoLevels<T, D> {
  const result: Record<string, unknown> = {};
  for (const outerKey in obj) {
    const inner = obj[outerKey];
    for (const innerKey in inner) {
      result[`${outerKey}${keyDelimiter}${innerKey}`] = inner[innerKey];
    }
  }
  return result as FlattenTwoLevels<T, D>;
}
export type InvertObj<O extends Record<string | number, string | number>> = {
  [K in O[keyof O]]: keyof O;
};

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
  V extends O[keyof O],
> = keyof SubType<O, V>;

export type RemoveFirstNFromKeys<T extends object, N extends number> = {
  [K in keyof T & string as RemoveFirstN<K, N>]: T[K];
};

export type KeyedMap<
  T extends Record<PropertyKey, object>, // was Record<PropertyKey, unknown>
  F extends keyof T[keyof T],
  N extends PropertyKey = "name",
> = Map<T[keyof T][F], { [K in keyof T]: T[K] & { [P in N]: K } }[keyof T]>;

function toKeyedMap<
  const T extends Record<PropertyKey, object>, // was Record<PropertyKey, unknown>
  F extends keyof T[keyof T],
  N extends PropertyKey = "name",
>(obj: T, idField: F, nameField: N = "name" as N): KeyedMap<T, F, N> {
  const map = new Map() as KeyedMap<T, F, N>;

  for (const outerKey of Object.keys(obj) as (keyof T)[]) {
    const entry = obj[outerKey] as Record<PropertyKey, unknown>;
    map.set(entry[idField as PropertyKey] as any, {
      ...entry,
      [nameField]: outerKey,
    } as any);
  }

  return map;
}
export const Obj = {
  toKeyedMap,
  flattenTwoLevels,
  pushByKey<
    O extends Record<string, any[]>,
    K extends keyof O,
    V extends O[K][number],
  >(obj: O, key: K, value: V) {
    if (!obj[key]) {
      obj[key] = [] as unknown as O[K];
    }
    obj[key].push(value);
  },
  keyByValue<O extends object, V extends O[keyof O]>(
    obj: O,
    value: V,
  ): keyof O {
    const key = Obj.keys(obj).find((key) => obj[key] === value);
    if (!key) {
      throw new Error("Value not found in object");
    }
    return key as keyof O;
  },
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
  pick<O extends object, KS extends keyof O>(obj: O, keys: KS[]): Pick<O, KS> {
    return keys.reduce(
      (objNext, key) => {
        if (key in obj) {
          objNext[key] = obj[key];
        }
        return objNext;
      },
      {} as Pick<O, KS>,
    );
  },
  validatePick<O extends object, VN extends PureValueName, KS extends keyof O>(
    obj: O,
    valueName: VN,
    ...keys: KS[]
  ): Record<KS, PureValue<VN>> {
    return keys.reduce(
      (objNext, key) => {
        const value = Val.validate[valueName](obj[key]) as PureValue<VN>;
        objNext[key] = value;
        return objNext;
      },
      {} as Record<KS, PureValue<VN>>,
    );
  },
  strictPick<O extends object, KS extends keyof O>(
    obj: O,
    keys: KS[],
  ): StrictPick<O, KS> {
    return keys.reduce(
      (objNext, key) => {
        if (key in obj) {
          objNext[key] = obj[key];
        } else {
          throw new Error(`Key ${String(key)} not in object`);
        }
        return objNext;
      },
      {} as StrictPick<O, KS>,
    );
  },
  pickStartsWith<T extends object, S extends string>(
    obj: T,
    prefix: S,
  ): PickStartsWith<T, S> {
    const result = {} as PickStartsWith<T, S>;
    for (const key in obj) {
      if (key.startsWith(prefix)) {
        result[key as unknown as keyof PickStartsWith<T, S>] = obj[
          key
        ] as unknown as PickStartsWith<T, S>[keyof PickStartsWith<T, S>];
      }
    }
    return result;
  },
  removeFirstNFromKeys<T extends object, N extends number>(
    obj: T,
    n: N,
  ): RemoveFirstNFromKeys<T, N> {
    const result = {} as RemoveFirstNFromKeys<T, N>;
    for (const key in obj) {
      const newKey = Str.removeFirstN(
        key,
        n,
      ) as unknown as keyof RemoveFirstNFromKeys<T, N>;
      result[newKey] = obj[key] as any;
    }
    return result;
  },
  strictOmit<O extends object, KS extends keyof O>(
    obj: O,
    ...keysToOmit: KS[]
  ): StrictOmit<O, KS> {
    return Obj.keys(obj).reduce(
      (objNext, key) => {
        if (!keysToOmit.includes(key as KS)) {
          (objNext as O)[key] = obj[key];
        }
        return objNext;
      },
      {} as StrictOmit<O, KS>,
    );
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
    value: V,
  ): PropKeyOfValue<O, V>[] {
    const keys = Obj.keys(obj).filter((key) => obj[key] === value);
    return keys as PropKeyOfValue<O, V>[];
  },
  invert<O extends Record<string | number, string | number>>(
    obj: O,
  ): { [K in O[keyof O]]: keyof O } {
    const objNext = {} as { [K in O[keyof O]]: keyof O };
    for (const key in obj) {
      const value = obj[key];
      objNext[value] = key;
    }
    return objNext;
  },
  merge,
  spread,
} as const;
