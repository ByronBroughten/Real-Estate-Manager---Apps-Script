export type StrictExtract<T, K extends T> = Extract<T, K>;
export type StrictExclude<T, K extends T> = Exclude<T, K>;

export const Arr = {
  compareForSort(a: unknown, b: unknown): number {
    if (typeof a === "number" && typeof b === "number") {
      return a - b;
    }
    if (typeof a === "string" && typeof b === "string") {
      return a.localeCompare(b);
    }
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() - b.getTime();
    }
    const stringA = String(a);
    const stringB = String(b);
    return stringA.localeCompare(stringB);
  },
  sortAscending(arr: unknown[]) {
    return [...arr].sort((a, b) => {
      return this.compareForSort(a, b);
    });
  },
  sortDescending(arr: unknown[]) {
    return [...arr].sort((a, b) => {
      return this.compareForSort(b, a);
    });
  },
  oneOrThrow<V extends any>(arr: readonly V[]): V {
    if (arr.length !== 1) {
      throw new Error("There is more than one item in this array.");
    } else return arr[0];
  },
  firstOrThrow<V extends any>(arr: readonly V[]): V {
    if (arr.length < 1) {
      throw new Error("This array is empty.");
    } else return arr[0];
  },
  lastOrThrow<V extends any>(arr: readonly V[]): V {
    const idx = this.lastIdx(arr);
    if (idx < 0) {
      throw new Error("This array has no last value—it has no value.");
    } else return arr[idx];
  },
  getOnlyItem<T extends any>(arr: T[], arrayOf?: string): T {
    const strArrayOf = arrayOf ?? "items";
    if (arr.length < 1) {
      throw new ValueNotFoundError(`The array does not have any ${strArrayOf}`);
    } else if (arr.length > 1) {
      throw new Error(`The array has too many ${strArrayOf}`);
    } else {
      return arr[0];
    }
  },
  insert<V>(arr: readonly V[], value: V, idx: number): V[] {
    const nextArr = [...arr];
    nextArr.splice(idx, 0, value);
    return nextArr;
  },
  nextRotatingValue<T>(arr: readonly T[], currentValue: T): T {
    const currentIdx = arr.indexOf(currentValue as any);
    const nextIdx = (currentIdx + 1) % arr.length;
    return arr[nextIdx];
  },
  replaceAtIdx<V>(arr: readonly V[], value: V, idx: number): V[] {
    const nextArr = [...arr];
    nextArr[idx] = value;
    return nextArr;
  },
  rmFirstMatchOrThrow<T extends any>(arr: T[], value: T): T[] {
    const index = arr.indexOf(value);
    if (index < 0) {
      throw new ValueNotFoundError(`No value in the array matches "${value}".`);
    }
    const nextArr = [...arr];
    nextArr.splice(index, 1);
    return nextArr;
  },
  rmFirstMatchFastMUTATE(arr: any[], value: any): void {
    const index = arr.indexOf(value);
    arr.splice(index, 1);
  },
  rmAtIndex<T>(arr: readonly T[], idx: number): T[] {
    this.validateIdxOrThrow(arr, idx);
    const nextArr = [...arr];
    nextArr.splice(idx, 1);
    return nextArr;
  },
  replaceValue(arr: any[], value: any, nextValue: any): any[] {
    const nextArr = [...arr];
    while (true) {
      const index = arr.indexOf(value);
      if (index === -1) break;
      nextArr[index] = nextValue;
    }
    return nextArr;
  },
  upOneDimension<T extends any>(arr: T[], innerArrsLength: number): T[][] {
    return arr.reduce(
      (arrOfArrs, item) => {
        if (arrOfArrs.length > 0) {
          const lastRow = this.lastOrThrow(arrOfArrs);
          if (lastRow.length === innerArrsLength) arrOfArrs.push([item]);
          else lastRow.push(item);
        }
        return arrOfArrs;
      },
      [[]] as T[][]
    );
  },
  indicesOf(arr: any[], value: any): number[] {
    const indices: number[] = [];
    for (const idx in arr) {
      if (arr[idx] === value) indices.push(parseInt(idx));
    }
    return indices;
  },
  lastIdx(arr: readonly any[]): number {
    return arr.length - 1;
  },
  isLastIdx(arr: readonly any[], idx: number): boolean {
    return this.lastIdx(arr) === idx;
  },

  includes<T, U extends T>(arr: readonly U[], elem: T): elem is U {
    return arr.includes(elem as any);
  },
  numsInOffsetLength(offset: number, length: number) {
    return Array.from({ length }, (_, k) => k + offset);
  },
  findAndRmFirst<T>(
    arr: T[],
    fn: (value: T) => boolean,
    mustFind: boolean = false
  ): T[] {
    const nextArr = [...arr];
    const idx = arr.findIndex(fn);
    if (mustFind && idx === -1)
      throw new ValueNotFoundError("Value not found to remove.");
    if (idx !== -1) arr.splice(idx, 1);
    return nextArr;
  },
  removeLast<T>(arr: T[]): T[] {
    const nextArr = [...arr];
    nextArr.pop();
    return nextArr;
  },
  findAll<T>(arr: readonly T[], fn: (value: T) => boolean): T[] {
    const arrClone = [...arr];
    const all: T[] = [];
    while (true) {
      const idx = arr.findIndex(fn);
      if (idx >= 0) {
        all.push(arr[idx]);
        arrClone.splice(idx, 1);
      } else {
        return all;
      }
    }
  },
  has<T>(arr: T[], fn: (value: T) => boolean): boolean {
    const value = arr.find(fn);
    if (value === undefined) return false;
    else return true;
  },
  exclude<A extends any, B extends any>(
    a: readonly A[],
    b: readonly B[]
  ): Exclude<A, B>[] {
    return a.filter((str) => !b.includes(str as any)) as Exclude<A, B>[];
  },
  excludeStrict<A extends any, B extends A>(
    a: readonly A[],
    b: readonly B[]
  ): Exclude<A, B>[] {
    return a.filter((str) => !b.includes(str as any)) as Exclude<A, B>[];
  },
  extractStrict<A extends any, B extends A>(
    a: readonly A[],
    b: readonly B[]
  ): Extract<A, B>[] {
    return a.filter((str) => b.includes(str as any)) as Extract<A, B>[];
  },
  extractOrder<A extends any, B extends A>(
    // is this useful?
    a: readonly A[],
    b: readonly B[]
  ): Extract<A, B>[] {
    return b.filter((str) => a.includes(str as any)) as Extract<A, B>[];
  },
  extract<A extends any, B extends any>(
    a: readonly A[],
    b: readonly B[]
  ): Extract<A, B>[] {
    return a.filter((str) => b.includes(str as any)) as Extract<A, B>[];
  },
  idxOrThrow<T>(arr: readonly T[], finder: (val: T) => boolean): number {
    const idx = arr.findIndex(finder);
    if (idx < 0) {
      throw new ValueNotFoundError("Value not found at any index.");
    }
    return idx;
  },
  validateIdxOrThrow(arr: readonly any[], idx: number): true {
    const highestIdx = arr.length - 1;
    if (idx > highestIdx) {
      throw new ValueNotFoundError(
        `The passed array does not have a value at passed idx ${idx}`
      );
    }
    return true;
  },
  combineWithoutIdenticals<A extends any, B extends any>(
    a: A[],
    b: B[]
  ): (A | B)[] {
    return [...new Set([...a, ...b])];
  },
} as const;

class ValueNotFoundError extends Error {}
