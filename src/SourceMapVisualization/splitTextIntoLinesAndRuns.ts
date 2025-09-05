/**
 * splitTextIntoLinesAndRuns
 * @param text
 * @param progress
 * @param ctx
 * @param style
 */
export default function splitTextIntoLinesAndRuns (text, progress, ctx, style) {
  ctx.font = style.current.font;
  const spaceWidth = ctx.measureText(' ').width;
  const spacesPerTab = 2;
  const parts = text.split(/(\r\n|\r|\n)/g);
  const unicodeWidthCache = new Map();
  const lines = [];
  const progressChunkSize = 1 << 20;
  let longestColumnForLine = new Int32Array(1024);
  let runData = new Int32Array(1024);
  let runDataLength = 0;
  let prevProgressPoint = 0;
  let longestLineInColumns = 0;
  let lineStartOffset = 0;

  for (let part = 0; part < parts.length; part++) {
    const raw = parts[part];
    if (part & 1) {
      // Accumulate the length of the newline (CRLF uses two code units)
      lineStartOffset += raw.length;
      continue;
    }

    const runBase = runDataLength;
    const n = raw.length + 1; // Add 1 for the extra character at the end
    let nextProgressPoint = progress ? prevProgressPoint + progressChunkSize - lineStartOffset : Infinity;
    let i = 0;
    let column = 0;

    while (i < n) {
      const startIndex = i;
      const startColumn = column;
      let whitespace = 0;
      let isSingleChunk = false;

      // Update the progress bar occasionally
      if (i > nextProgressPoint) {
        progress(lineStartOffset + i - prevProgressPoint);
        prevProgressPoint = lineStartOffset + i;
        nextProgressPoint = i + progressChunkSize;
      }

      while (i < n) {
        let c1 = raw.charCodeAt(i);
        let c2;

        // Draw each tab into its own run
        if (c1 === 0x09 /* tab */) {
          if (i > startIndex) break;
          isSingleChunk = true;
          column += spacesPerTab;
          column -= column % spacesPerTab;
          i++;
          whitespace = c1;
          break;
        }

        // Draw each newline into its own run
        // eslint-disable-next-line no-self-compare
        if (c1 !== c1 /* end of line */) {
          if (i > startIndex) break;
          isSingleChunk = true;
          column++;
          i++;
          whitespace = 0x0A;
          break;
        }

        // Draw each non-ASCII character into its own run (e.g. emoji)
        if (c1 < 0x20 || c1 > 0x7E) {
          if (i > startIndex) break;
          isSingleChunk = true;
          i++;
          // Consume another code unit if this code unit is a high surrogate
          // and the next code point is a low surrogate. This handles code
          // points that span two UTF-16 code units.
          if (i < n && c1 >= 0xD800 && c1 <= 0xDBFF && (c2 = raw.charCodeAt(i)) >= 0xDC00 && c2 <= 0xDFFF) {
            i++;
          }
          // This contains some logic to handle more complex emoji such as "👯‍♂️"
          // which is [U+1F46F, U+200D, U+2642, U+FE0F].
          while (i < n) {
            c1 = raw.charCodeAt(i);
            // Consume another code unit if the next code point is a variation selector
            // eslint-disable-next-line max-depth
            if ((c1 & ~0xF) === 0xFE00) {
              i++;
              // eslint-disable-next-line brace-style
            }
            // Consume another code unit if the next code point is a skin tone modifier
            else if (c1 === 0xD83C && i + 1 < n && (c2 = raw.charCodeAt(i + 1)) >= 0xDFFB && c2 <= 0xDFFF) {
              i += 2;
              // eslint-disable-next-line brace-style
            }
            // Consume another code unit and stop if the next code point is a zero-width non-joiner
            else if (c1 === 0x200C) {
              i++;
              break;
              // eslint-disable-next-line brace-style
            }
            // Consume another code unit if the next code point is a zero-width joiner
            else if (c1 === 0x200D) {
              i++;

              // Consume the next code point that is "joined" to this one
              // eslint-disable-next-line max-depth
              if (i < n) {
                c1 = raw.charCodeAt(i);
                i++;
                // eslint-disable-next-line max-depth
                if (c1 >= 0xD800 && c1 <= 0xDBFF && i < n && (c2 = raw.charCodeAt(i)) >= 0xDC00 && c2 <= 0xDFFF) {
                  i++;
                }
              }
            } else {
              break;
            }
          }

          const key = raw.slice(startIndex, i);
          let width = unicodeWidthCache.get(key);
          if (width === void 0) {
            width = Math.round(ctx.measureText(key).width / spaceWidth);
            if (width < 1) width = 1;
            unicodeWidthCache.set(key, width);
          }
          column += width;
          break;
        }

        // Draw runs of spaces in their own run
        if (c1 === 0x20 /* space */) {
          if (i === startIndex) whitespace = c1;
          else if (!whitespace) break;
        } else {
          if (whitespace) break;
        }

        column++;
        i++;
      }

      // Append the run to the typed array
      if (runDataLength + 5 > runData.length) {
        const newData = new Int32Array(runData.length << 1);
        newData.set(runData);
        runData = newData;
      }
      runData[runDataLength] = whitespace | (isSingleChunk ? 0x100 /* isSingleChunk */ : 0);
      runData[runDataLength + 1] = startIndex;
      runData[runDataLength + 2] = i;
      runData[runDataLength + 3] = startColumn;
      runData[runDataLength + 4] = column;
      runDataLength += 5;
    }

    const lineIndex = lines.length;
    if (lineIndex >= longestColumnForLine.length) {
      const newData = new Int32Array(longestColumnForLine.length << 1);
      newData.set(longestColumnForLine);
      longestColumnForLine = newData;
    }
    longestColumnForLine[lineIndex] = column;

    const runCount = (runDataLength - runBase) / 5;
    lines.push({ raw, runBase, runCount, runText: {}, endIndex: i, endColumn: column });
    longestLineInColumns = Math.max(longestLineInColumns, column);
    lineStartOffset += raw.length;
  }

  if (prevProgressPoint < text.length && progress) {
    progress(text.length - prevProgressPoint);
  }
  return { lines, longestColumnForLine, longestLineInColumns, runData: runData.subarray(0, runDataLength) };
}
