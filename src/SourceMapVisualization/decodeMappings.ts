const vlqTable = new Uint8Array(128);
const vlqChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
for (let i = 0; i < vlqTable.length; i++) vlqTable[i] = 0xFF;
for (let i = 0; i < vlqChars.length; i++) vlqTable[vlqChars.charCodeAt(i)] = i;

/**
 * decodeMappings
 * @param mappings
 * @param sourcesCount
 * @param namesCount
 */
export default function decodeMappings (mappings, sourcesCount, namesCount) {
  const n = mappings.length;
  let data = new Int32Array(1024);
  let dataLength = 0;
  let generatedLine = 0;
  let generatedLineStart = 0;
  let generatedColumn = 0;
  let originalSource = 0;
  let originalLine = 0;
  let originalColumn = 0;
  let originalName = 0;
  let needToSortGeneratedColumns = false;
  let i = 0;


  function _decodeVLQ () {
    let shift = 0;
    let vlq = 0;

    // Scan over the input
    // eslint-disable-next-line no-constant-condition
    while (true) {
      // Read a byte
      if (i >= mappings.length) throw new Error('Unexpected early end of mapping data');
      const code = mappings.charCodeAt(i);
      if ((code & 0x7F) !== code) throw new Error(`Invalid mapping character: ${JSON.stringify(String.fromCharCode(code))}`);
      const index = vlqTable[code & 0x7F];
      if (index === 0xFF) throw new Error(`Invalid mapping character: ${JSON.stringify(String.fromCharCode(code))}`);
      i++;

      // Decode the byte
      vlq |= (index & 31) << shift;
      shift += 5;

      // Stop if there's no continuation bit
      if ((index & 32) === 0) break;
    }

    // Recover the signed value
    return vlq & 1 ? -(vlq >> 1) : vlq >> 1;
  }

  while (i < n) {
    let code = mappings.charCodeAt(i);

    // Handle a line break
    if (code === 59 /* ; */) {
      // The generated columns are very rarely out of order. In that case,
      // sort them with insertion since they are very likely almost ordered.
      if (needToSortGeneratedColumns) {
        for (let j = generatedLineStart + 6; j < dataLength; j += 6) {
          const genL = data[j];
          const genC = data[j + 1];
          const origS = data[j + 2];
          const origL = data[j + 3];
          const origC = data[j + 4];
          const origN = data[j + 5];
          let k = j - 6;
          for (; k >= generatedLineStart && data[k + 1] > genC; k -= 6) {
            data[k + 6] = data[k];
            data[k + 7] = data[k + 1];
            data[k + 8] = data[k + 2];
            data[k + 9] = data[k + 3];
            data[k + 10] = data[k + 4];
            data[k + 11] = data[k + 5];
          }
          data[k + 6] = genL;
          data[k + 7] = genC;
          data[k + 8] = origS;
          data[k + 9] = origL;
          data[k + 10] = origC;
          data[k + 11] = origN;
        }
      }

      generatedLine++;
      generatedColumn = 0;
      generatedLineStart = dataLength;
      needToSortGeneratedColumns = false;
      i++;
      continue;
    }

    // Ignore stray commas
    if (code === 44 /* , */) {
      i++;
      continue;
    }

    // Read the generated column
    const generatedColumnDelta = _decodeVLQ();
    if (generatedColumnDelta < 0) needToSortGeneratedColumns = true;
    generatedColumn += generatedColumnDelta;
    if (generatedColumn < 0) throw new Error(`Invalid generated column: ${generatedColumn}`);

    // It's valid for a mapping to have 1, 4, or 5 variable-length fields
    let isOriginalSourceMissing = true;
    let isOriginalNameMissing = true;
    if (i < n) {
      code = mappings.charCodeAt(i);
      if (code === 44 /* , */) {
        i++;
      } else if (code !== 59 /* ; */) {
        isOriginalSourceMissing = false;

        // Read the original source
        const originalSourceDelta = _decodeVLQ();
        originalSource += originalSourceDelta;
        if (originalSource < 0 || originalSource >= sourcesCount) {
          throw new Error(`Original source index ${originalSource} is invalid (there are ${sourcesCount} sources)`);
        }

        // Read the original line
        const originalLineDelta = _decodeVLQ();
        originalLine += originalLineDelta;
        if (originalLine < 0) throw new Error(`Invalid original line: ${originalLine}`);

        // Read the original column
        const originalColumnDelta = _decodeVLQ();
        originalColumn += originalColumnDelta;
        if (originalColumn < 0) throw new Error(`Invalid original column: ${originalColumn}`);

        // Check for the optional name index
        if (i < n) {
          code = mappings.charCodeAt(i);
          if (code === 44 /* , */) {
            i++;
          } else if (code !== 59 /* ; */) {
            isOriginalNameMissing = false;

            // Read the optional name index
            const originalNameDelta = _decodeVLQ();
            originalName += originalNameDelta;
            // eslint-disable-next-line max-depth
            if (originalName < 0 || originalName >= namesCount) {
              throw new Error(`Original name index ${originalName} is invalid (there are ${namesCount} names)`);
            }

            // Handle the next character
            // eslint-disable-next-line max-depth
            if (i < n) {
              code = mappings.charCodeAt(i);
              // eslint-disable-next-line max-depth
              if (code === 44 /* , */) {
                i++;
              } else if (code !== 59 /* ; */) {
                throw new Error(`Invalid character after mapping: ${JSON.stringify(String.fromCharCode(code))}`);
              }
            }
          }
        }
      }
    }

    // Append the mapping to the typed array
    if (dataLength + 6 > data.length) {
      const newData = new Int32Array(data.length << 1);
      newData.set(data);
      data = newData;
    }
    data[dataLength] = generatedLine;
    data[dataLength + 1] = generatedColumn;
    if (isOriginalSourceMissing) {
      data[dataLength + 2] = -1;
      data[dataLength + 3] = -1;
      data[dataLength + 4] = -1;
    } else {
      data[dataLength + 2] = originalSource;
      data[dataLength + 3] = originalLine;
      data[dataLength + 4] = originalColumn;
    }
    data[dataLength + 5] = isOriginalNameMissing ? -1 : originalName;
    dataLength += 6;
  }

  return data.subarray(0, dataLength);
}
