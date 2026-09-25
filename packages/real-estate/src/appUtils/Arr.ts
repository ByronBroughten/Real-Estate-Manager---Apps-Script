import { Val } from "./Val";
// The app's own array helpers; the framework's Arr is internal.
export const Arr = {
  firstOrThrow<V>(arr: readonly V[]): V {
    if (arr.length < 1) {
      throw new Error("This array is empty.");
    } else return Val.assert(arr[0], "The first item");
  },
};
