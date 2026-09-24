// The app's own value helpers; the framework's Val is internal.
function assert<T>(
  value: T | null | undefined,
  whatNotFound: string = "Value",
): T {
  if (value === null || value === undefined) {
    throw new Error(`${whatNotFound} not found.`);
  }
  return value;
}

export const Val = {
  assert,
};
