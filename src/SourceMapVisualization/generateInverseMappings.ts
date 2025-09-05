/**
 * generateInverseMappings
 * @param sources
 * @param data
 */
export default function generateInverseMappings (sources, data) {
  let longestDataLength = 0;

  // Scatter the mappings to the individual sources
  for (let i = 0, n = data.length; i < n; i += 6) {
    const originalSource = data[i + 2];
    if (originalSource === -1) continue;

    const source = sources[originalSource];
    let inverseData = source.data;
    let j = source.dataLength;

    // Append the mapping to the typed array
    if (j + 6 > inverseData.length) {
      const newLength = inverseData.length << 1;
      const newData = new Int32Array(newLength > 1024 ? newLength : 1024);
      newData.set(inverseData);
      source.data = newData;
      inverseData = newData;
    }
    inverseData[j] = data[i];
    inverseData[j + 1] = data[i + 1];
    inverseData[j + 2] = originalSource;
    inverseData[j + 3] = data[i + 3];
    inverseData[j + 4] = data[i + 4];
    inverseData[j + 5] = data[i + 5];
    j += 6;
    source.dataLength = j;
    if (j > longestDataLength) longestDataLength = j;
  }

  // Sort the mappings for each individual source
  const temp = new Int32Array(longestDataLength);
  for (const source of sources) {
    const data = source.data.subarray(0, source.dataLength);

    // Sort lazily for performance
    let isSorted = false;
    Object.defineProperty(source, 'data', {
      get () {
        if (!isSorted) {
          temp.set(data);
          _topDownSplitMerge(temp, 0, data.length, data);
          isSorted = true;
        }
        return data;
      },
    });
  }

  // From: https://en.wikipedia.org/wiki/Merge_sort
  function _topDownSplitMerge (b, iBegin, iEnd, a) {
    if (iEnd - iBegin <= 6) return;

    // Optimization: Don't do merge sort if it's already sorted
    let isAlreadySorted = true;
    for (let i = iBegin + 3, j = i + 6; j < iEnd; i = j, j += 6) {
      // Compare mappings first by original line (index 3) and then by original column (index 4)
      if (a[i] < a[j] || (a[i] === a[j] && a[i + 1] <= a[j + 1])) continue;
      isAlreadySorted = false;
      break;
    }
    if (isAlreadySorted) {
      return;
    }

    const iMiddle = (((iEnd / 6) + (iBegin / 6)) >> 1) * 6;
    _topDownSplitMerge(a, iBegin, iMiddle, b);
    _topDownSplitMerge(a, iMiddle, iEnd, b);
    _topDownMerge(b, iBegin, iMiddle, iEnd, a);
  }

  // From: https://en.wikipedia.org/wiki/Merge_sort
  function _topDownMerge (a, iBegin, iMiddle, iEnd, b) {
    let i = iBegin;
    let j = iMiddle;
    for (let k = iBegin; k < iEnd; k += 6) {
      if (i < iMiddle && (j >= iEnd ||
        // Compare mappings first by original line (index 3) and then by original column (index 4)
        a[i + 3] < a[j + 3] ||
        (a[i + 3] === a[j + 3] && a[i + 4] <= a[j + 4])
      )) {
        b[k] = a[i];
        b[k + 1] = a[i + 1];
        b[k + 2] = a[i + 2];
        b[k + 3] = a[i + 3];
        b[k + 4] = a[i + 4];
        b[k + 5] = a[i + 5];
        i += 6;
      } else {
        b[k] = a[j];
        b[k + 1] = a[j + 1];
        b[k + 2] = a[j + 2];
        b[k + 3] = a[j + 3];
        b[k + 4] = a[j + 4];
        b[k + 5] = a[j + 5];
        j += 6;
      }
    }
  }
}
