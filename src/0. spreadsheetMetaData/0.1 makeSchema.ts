export function makeSchemaStructure<const S extends unknown, T extends S>(
  _structure: S,
  t: T,
): T {
  return t;
}
