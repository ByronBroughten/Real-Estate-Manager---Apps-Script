export function makeSchemaNames<T extends readonly string[]>(t: T): T {
  return t;
}

export type EnforceName<Arr extends readonly string[]> = Arr[number];

export type MakeSchemaDict<KS extends string, V extends Record<KS, any>> = V;

export function makeSchemaDict<
  KS extends readonly string[],
  VS extends any,
  D extends Record<KS[number], VS>
>(_keys: KS, _valueSchema: VS, dict: D): D {
  return dict;
}

export function makeSchemaStructure<S extends any, T extends S>(
  _structure: S,
  t: T
): T {
  return t;
}
