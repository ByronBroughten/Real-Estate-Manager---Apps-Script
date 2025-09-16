export function enforceNames<T extends readonly string[]>(t: T): T {
  return t;
}

export type EnforceName<Arr extends readonly string[]> = Arr[number];

export type EnforceDict<KS extends string, V extends any> = {
  [K in KS]: V;
};

export function enforceDict<
  KS extends readonly string[],
  VS extends any,
  D extends Record<KS[number], VS>
>(_keys: KS, _valueSchema: VS, dict: D): D {
  return dict;
}
