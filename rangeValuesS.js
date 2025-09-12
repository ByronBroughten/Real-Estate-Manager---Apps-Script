function makeRangeData(vls, names, keyArr) {
  const rangeData = [];
  for (const key of keyArr) {
    rangeData.push({
      range: names[key],
      values: vls[key]
    })
  }
  return rangeData;
}

function getValuesFromRangeNames(names) {
  const namedValues = {}
  for (name in names) {
    namedRange = getNamedRange(names[name]);
    namedValues[name] = namedRange.getValues();
  }
  return namedValues
}

