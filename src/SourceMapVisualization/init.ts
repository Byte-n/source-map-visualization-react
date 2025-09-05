/* eslint-disable */
import { deepMerge } from './utils';
import parseSourceMap from './parseSourceMap';
import splitTextIntoLinesAndRuns from './splitTextIntoLinesAndRuns';

export interface CodeHover {
  row: number;
  col: number;
}

export interface SourceCodeHover extends CodeHover {
  source: string;
}

export interface InitConfig {
  code: string;
  codeMap: string;
  canvas: HTMLCanvasElement;
  style?: CodeMapStyle;
  onSourceFileSelected: (value: number) => void;
  onSourceFileListChange: (fls: { label: string; value: number }[]) => void;
  onSourceCodeHover: (value: SourceCodeHover | null) => void;
  onMinifyCodeHover: (value: CodeHover | null) => void;
  onOtherHover: (value: CodeHover | null) => void;
  resize: boolean;
}

export interface CodeMapStyle {
  textColor?: string;
  font?: string;
  lineNumber?: {
    width?: number;
    borderColor?: string;
    backgroundColor?: string;
    textColor?: string;
    font?: string;
  };
  scrollbar?: {
    fillStyle?: string;
    size?: number;
    scrollXShadowRgb?: [number, number, number];
  };
  backgroundColor?: string;
  sourceCodeColors?: string[];
  rowHeight?: number;
  hoverBox?: {
    shadowBlur?: number;
    fillStyle?: string;
    strokeStyle?: string;
    lineWidth?: number;
  };
  caret?: {
    textColor?: string;
  };
  hoverArrow?: {
    color?: string;
    lineWidth?: number;
    arrowR?: number;
  };
}

export interface Instance {
  selectSourceFile: (idx: number) => void;
  wrap: (val: boolean) => void;
  destroy: VoidFunction;
  resize: VoidFunction;
  setStyle: (style: CodeMapStyle) => void;
}

const defaultStyle = {
  font: '14px monospace',
  lineNumber: {
    width: 64,
    borderColor: 'rgba(127, 127, 127, 0.5)',
    backgroundColor: 'rgba(127, 127, 127, 0.1)',
    textColor: '#404040',
    font: '11px monospace',
  },
  scrollbar: {
    fillStyle: 'rgba(127, 127, 127, 0.5)',
    size: 10,
    scrollXShadowRgb: [255, 0, 0],
  },
  rowHeight: 22,
  textColor: '#000',
  backgroundColor: '#F5F5F5',
  sourceCodeColors: [
    'rgba(25, 133, 255, 0.3)', // Blue
    'rgba(174, 97, 174, 0.3)', // Purple
    'rgba(255, 97, 106, 0.3)', // Red
    'rgba(250, 192, 61, 0.3)', // Yellow
    'rgba(115, 192, 88, 0.3)', // Green
  ],
  hoverBox: {
    shadowBlur: 20,
    fillStyle: 'red',
    strokeStyle: 'red',
    lineWidth: 0.5,
  },
  caret: { textColor: 'rgba(255,0,0,0.54)' },
  hoverArrow: {
    color: 'red',
    lineWidth: 1,
    arrowR: 4,
  },
};

export default (config: InitConfig) => {
  const {
    code,
    codeMap,
    canvas,
    onSourceFileListChange,
    onSourceFileSelected,
    onSourceCodeHover,
    onMinifyCodeHover,
    onOtherHover,
    resize,
  } = config;

  const style = {
    current: deepMerge(config.style, defaultStyle as CodeMapStyle),
  };

  // Use a striped pattern for bad mappings (good mappings are solid)
  const patternContours = [
    [0, 24, 24, 0, 12, 0, 0, 12, 0, 24],
    [0, 28, 28, 0, 40, 0, 0, 40, 0, 28],
    [0, 44, 44, 0, 56, 0, 0, 56, 0, 44],
    [12, 64, 24, 64, 64, 24, 64, 12, 12, 64],
    [0, 60, 0, 64, 8, 64, 64, 8, 64, 0, 60, 0, 0, 60],
    [28, 64, 40, 64, 64, 40, 64, 28, 28, 64],
    [0, 8, 8, 0, 0, 0, 0, 8],
    [44, 64, 56, 64, 64, 56, 64, 44, 44, 64],
    [64, 64, 64, 60, 60, 64, 64, 64],
  ];
  const badMappingPatterns = style.current.sourceCodeColors.map((color) => {
    let patternCanvas = document.createElement('canvas');
    let patternContext = patternCanvas.getContext('2d');
    let ratio, scale, pattern;
    return (dx, dy) => {
      if (devicePixelRatio !== ratio) {
        ratio = devicePixelRatio;
        scale = Math.round(64 * ratio) / 64;
        patternCanvas.width = patternCanvas.height = Math.round(64 * scale);
        patternContext.scale(scale, scale);
        patternContext.beginPath();
        for (const contour of patternContours) {
          for (let i = 0; i < contour.length; i += 2) {
            if (i === 0) patternContext.moveTo(contour[i], contour[i + 1]);
            else patternContext.lineTo(contour[i], contour[i + 1]);
          }
        }
        patternContext.fillStyle = color.replace(' 0.3)', ' 0.2)');
        patternContext.fill();
        pattern = ctx.createPattern(patternCanvas, 'repeat');
      }
      pattern.setTransform(new DOMMatrix([1 / scale, 0, 0, 1 / scale, dx, dy]));
      return pattern;
    };
  });

  const ctx = canvas.getContext('2d');
  const lineNumberWidth = style.current.lineNumber.width;
  let isInvalid = true;
  let originalTextArea;
  let generatedTextArea;
  let hover = null;
  let wrap = false;

  let size = {
    width: canvas.parentElement.clientWidth,
    height: canvas.parentElement.clientHeight,
  };

  async function finishLoadingCodeWithEmbeddedSourceMap(code, file) {
    let url, match;

    // Check for both "//" and "/*" comments. This is mostly done manually
    // instead of doing it all with a regular expression because Firefox's
    // regular expression engine crashes with an internal error when the
    // match is too big.
    for (
      let regex = /\/([*/])[#@] *sourceMappingURL=/g;
      (match = regex.exec(code));

    ) {
      const start = match.index + match[0].length;
      const n = code.length;
      let end = start;
      while (end < n && code.charCodeAt(end) > 32) {
        end++;
      }
      if (
        end > start &&
        (match[1] === '/' || code.slice(end).indexOf('*/') > 0)
      ) {
        url = code.slice(start, end);
        break;
      }
    }

    // Check for a non-empty data URL payload
    if (url) {
      let map;
      try {
        // Use "new URL" to ensure that the URL has a protocol (e.g. "data:" or "https:")
        map = await fetch(new URL(url)).then((r) => r.text());
      } catch (e) {
        throw Error(
          `Failed to parse the URL in the "/${
            match[1]
          }# sourceMappingURL=" comment: ${(e && e.message) || e}`,
        );
      }
      finishLoading(code, map);
    } else {
      throw Error('not found sourceMapping!');
    }
  }

  function finishLoading(code, map) {
    const startTime = Date.now();
    onSourceFileListChange(null);

    onSourceCodeHover(null);
    onMinifyCodeHover(null);
    onOtherHover(null);
    originalTextArea = generatedTextArea = hover = null;
    isInvalid = true;

    // Let the browser update before parsing the source map, which may be slow
    const sm = parseSourceMap(map);

    // Show a progress bar if this is is going to take a while
    let charsSoFar = 0;
    let progressCalls = 0;
    let isProgressVisible = false;
    const progressStart = Date.now();
    const totalChars =
      code.length + (sm.sources.length > 0 ? sm.sources[0].content.length : 0);
    const progress = (chars) => {
      charsSoFar += chars;
      if (!isProgressVisible && progressCalls++ > 2 && charsSoFar) {
        const estimatedTimeLeftMS =
          ((Date.now() - progressStart) / charsSoFar) *
          (totalChars - charsSoFar);
        if (estimatedTimeLeftMS > 250) {
          console.log('progress BarOverlay visible');
          isProgressVisible = true;
        }
      }
      if (isProgressVisible) {
        console.log('progress ', charsSoFar / totalChars);
      }
    };

    // Update the original text area when the source changes
    const otherSource = (index) =>
      index === -1 ? null : sm.sources[index].name;
    const originalName = (index) => sm.names[index];
    let finalOriginalTextArea = null;
    if (sm.sources.length > 0) {
      const updateOriginalSource = (sourceIndex, progress?) => {
        const source = sm.sources[sourceIndex];
        return createTextArea({
          sourceIndex,
          text: source.content,
          progress,
          mappings: source.data,
          mappingsOffset: 3,
          otherSource,
          originalName,
          bounds() {
            return {
              x: 0,
              y: 0,
              width: size.width >>> 1,
              height: size.height,
            };
          },
        });
      };
      finalOriginalTextArea = updateOriginalSource(0, progress);
      onSourceFileSelected(0);
      instance.selectSourceFile = (idx: number) => {
        originalTextArea = updateOriginalSource(idx);
        isInvalid = true;
      };
    }

    generatedTextArea = createTextArea({
      sourceIndex: null,
      text: code,
      progress,
      mappings: sm.data,
      mappingsOffset: 0,
      otherSource,
      originalName,
      bounds() {
        const x = size.width >> 1;
        return {
          x,
          y: 0,
          width: size.width - x,
          height: size.height,
        };
      },
    });

    // Only render the original text area once the generated text area is ready
    originalTextArea = finalOriginalTextArea;
    isInvalid = true;

    // Populate the file picker once there will be no more await points
    const filesList = [];
    if (sm.sources.length > 0) {
      for (let sources = sm.sources, i = 0, n = sources.length; i < n; i++) {
        filesList.push({ value: i, label: sources[i].name });
      }
    } else {
      // option.textContent = `(no original code)`;
    }
    onSourceFileListChange(filesList);

    if (isProgressVisible) {
      console.log('progressBarOverlay hidden');
    }
    const endTime = Date.now();
    console.log(`Finished loading in ${endTime - startTime}ms`);
  }

  function createTextArea({
    sourceIndex,
    text,
    progress,
    mappings,
    mappingsOffset,
    otherSource,
    originalName,
    bounds,
  }) {
    const shadowWidth = 16;
    const textPaddingX = 5;
    const textPaddingY = 1;

    // Runs are stored in a flat typed array to improve loading time
    const run_whitespace = (index) => runData[index] & 0xff;
    const run_isSingleChunk = (index) => runData[index] & 0x100;
    const run_startIndex = (index) => runData[index + 1];
    const run_endIndex = (index) => runData[index + 2];
    const run_startColumn = (index) => runData[index + 3];
    const run_endColumn = (index) => runData[index + 4];

    let { lines, longestColumnForLine, longestLineInColumns, runData } =
      splitTextIntoLinesAndRuns(text, progress, ctx, style);
    let animate = null;
    let lastLineIndex = lines.length - 1;
    let scrollX = 0;
    let scrollY = 0;

    // Source mappings may lie outside of the source code. This happens both
    // when the source code is missing or when the source mappings are buggy.
    // In these cases, we should extend the scroll area to allow the user to
    // view these out-of-bounds source mappings.
    for (let i = 0, n = mappings.length; i < n; i += 6) {
      let line = mappings[i + mappingsOffset];
      let column = mappings[i + mappingsOffset + 1];
      if (line < lines.length) {
        const { endIndex, endColumn } = lines[line];

        // Take into account tabs tops and surrogate pairs
        if (endColumn > column) {
          column = endColumn;
        } else if (column > endColumn) {
          column = column - endIndex + endColumn;
        }
      } else if (line > lastLineIndex) {
        lastLineIndex = line;
      }
      if (column > longestLineInColumns) {
        longestLineInColumns = column;
      }
      if (line >= longestColumnForLine.length) {
        const newData = new Int32Array(longestColumnForLine.length << 1);
        newData.set(longestColumnForLine);
        longestColumnForLine = newData;
      }
      longestColumnForLine[line] = column;
    }

    const wrappedRowsCache = new Map();

    function computeColumnsAcross(width, columnWidth) {
      const scrollbarThickness = style.current.scrollbar.size;
      if (!wrap) return Infinity;
      return Math.max(
        1,
        Math.floor(
          (width - lineNumberWidth - textPaddingX - scrollbarThickness) /
            columnWidth,
        ),
      );
    }

    function wrappedRowsForColumns(columnsAcross) {
      let result = wrappedRowsCache.get(columnsAcross);
      if (!result) {
        result = new Int32Array(lastLineIndex + 2);
        let rows = 0,
          n = lastLineIndex + 1;
        if (columnsAcross === Infinity) {
          for (let i = 0; i <= n; i++) {
            result[i] = i;
          }
        } else {
          for (let i = 0; i < n; i++) {
            result[i] = rows;
            rows += Math.ceil(longestColumnForLine[i] / columnsAcross) || 1;
          }
          result[n] = rows;
        }
        wrappedRowsCache.set(columnsAcross, result);
      }
      return result;
    }

    function computeScrollbarsAndClampScroll() {
      console.log('style.current:', style.current);
      const scrollbarThickness = style.current.scrollbar.size;
      const { width, height } = bounds();
      ctx.font = '14px monospace';
      const columnWidth = ctx.measureText(' '.repeat(64)).width / 64;
      const columnsAcross = computeColumnsAcross(width, columnWidth);
      const wrappedRows = wrappedRowsForColumns(columnsAcross);

      let scrollbarX = null;
      let scrollbarY = null;
      let maxScrollX;
      let maxScrollY;

      if (wrap) {
        maxScrollX = 0;
        maxScrollY =
          (wrappedRowsForColumns(computeColumnsAcross(width, columnWidth))[
            lastLineIndex + 1
          ] -
            1) *
          style.current.rowHeight;
      } else {
        maxScrollX = Math.round(
          longestLineInColumns * columnWidth +
            textPaddingX * 2 +
            lineNumberWidth +
            scrollbarThickness -
            width,
        );
        maxScrollY = lastLineIndex * style.current.rowHeight;
      }

      scrollX = Math.max(0, Math.min(scrollX, maxScrollX));
      scrollY = Math.max(0, Math.min(scrollY, maxScrollY));

      if (maxScrollX > 0) {
        const trackLength = width - lineNumberWidth - scrollbarThickness / 2;
        scrollbarX = {
          trackLength,
          thumbLength: Math.max(
            scrollbarThickness * 2,
            trackLength / (1 + maxScrollX / trackLength),
          ),
        };
      }

      if (maxScrollY > 0) {
        const trackLength = height - scrollbarThickness / 2;
        scrollbarY = {
          trackLength,
          thumbLength: Math.max(
            scrollbarThickness * 2,
            trackLength / (1 + maxScrollY / trackLength),
          ),
        };
      }

      return {
        columnWidth,
        columnsAcross,
        wrappedRows,
        maxScrollX,
        maxScrollY,
        scrollbarX,
        scrollbarY,
      };
    }

    const emptyLine = { raw: '', runCount: 0 };

    function analyzeLine(line, column, fractionalColumn, tabStopBehavior) {
      let index = column;
      let firstRun = 0;
      let nearbyRun = 0;
      let { raw, runBase, runCount, runText } =
        line < lines.length ? lines[line] : emptyLine;
      let runLimit = runCount;
      let endOfLineIndex = 0;
      let endOfLineColumn = 0;
      let beforeNewlineIndex = 0;
      let hasTrailingNewline = false;

      if (runLimit > 0) {
        let lastRun = runBase + 5 * (runLimit - 1);
        endOfLineIndex = run_endIndex(lastRun);
        endOfLineColumn = run_endColumn(lastRun);
        beforeNewlineIndex = run_startIndex(lastRun);
        hasTrailingNewline = run_whitespace(lastRun) === 0x0a /* newline */;

        // Binary search to find the first run
        firstRun = 0;
        while (runLimit > 0) {
          let step = runLimit >> 1;
          let it = firstRun + step;
          if (run_endColumn(runBase + 5 * it) < column) {
            firstRun = it + 1;
            runLimit -= step + 1;
          } else {
            runLimit = step;
          }
        }

        // Use the last run if we're past the end of the line
        if (firstRun >= runCount) firstRun--;

        // Convert column to index
        nearbyRun = firstRun;
        while (
          run_startColumn(runBase + 5 * nearbyRun) > column &&
          nearbyRun > 0
        )
          nearbyRun--;
        while (
          run_endColumn(runBase + 5 * nearbyRun) < column &&
          nearbyRun + 1 < runCount
        )
          nearbyRun++;
        let run = runBase + 5 * nearbyRun;
        if (run_isSingleChunk(run) && column <= run_endColumn(run)) {
          // A special case for single-character blocks such as tabs and emoji
          if (
            (tabStopBehavior === 'round' &&
              fractionalColumn >=
                (run_startColumn(run) + run_endColumn(run)) / 2) ||
            (tabStopBehavior === 'floor' &&
              fractionalColumn >= run_endColumn(run))
          ) {
            index = run_endIndex(run);
            column = run_endColumn(run);
          } else {
            index = run_startIndex(run);
            column = run_startColumn(run);
          }
        } else {
          index = run_startIndex(run) + column - run_startColumn(run);
        }
      }

      // Binary search to find the first mapping that is >= index
      let firstMapping = 0;
      let mappingCount = mappings.length;
      while (mappingCount > 0) {
        let step = ((mappingCount / 6) >> 1) * 6;
        let it = firstMapping + step;
        let mappingLine = mappings[it + mappingsOffset];
        if (
          mappingLine < line ||
          (mappingLine === line && mappings[it + mappingsOffset + 1] < index)
        ) {
          firstMapping = it + 6;
          mappingCount -= step + 6;
        } else {
          mappingCount = step;
        }
      }

      // Back up to the previous mapping if we're at the end of the line or the mapping we found is after us
      if (
        firstMapping > 0 &&
        mappings[firstMapping - 6 + mappingsOffset] === line &&
        (firstMapping >= mappings.length ||
          mappings[firstMapping + mappingsOffset] > line ||
          mappings[firstMapping + mappingsOffset + 1] > index)
      ) {
        firstMapping -= 6;
      }

      // Seek to the first of any duplicate mappings
      const current = mappings[firstMapping + mappingsOffset + 1];
      while (
        firstMapping > 0 &&
        mappings[firstMapping - 6 + mappingsOffset] === line &&
        mappings[firstMapping - 6 + mappingsOffset + 1] === current
      ) {
        firstMapping -= 6;
      }

      function columnToIndex(column) {
        // If there is no underlying line, just use one index per column
        let index = column;
        if (runCount > 0) {
          while (
            run_startColumn(runBase + 5 * nearbyRun) > column &&
            nearbyRun > 0
          )
            nearbyRun--;
          while (
            run_endColumn(runBase + 5 * nearbyRun) < column &&
            nearbyRun + 1 < runCount
          )
            nearbyRun++;
          let run = runBase + 5 * nearbyRun;
          index =
            column === run_endColumn(run)
              ? run_endIndex(run)
              : run_startIndex(run) + column - run_startColumn(run);
        }
        return index;
      }

      function indexToColumn(index) {
        // If there is no underlying line, just use one column per index
        let column = index;
        if (runCount > 0) {
          while (
            run_startIndex(runBase + 5 * nearbyRun) > index &&
            nearbyRun > 0
          )
            nearbyRun--;
          while (
            run_endIndex(runBase + 5 * nearbyRun) < index &&
            nearbyRun + 1 < runCount
          )
            nearbyRun++;
          let run = runBase + 5 * nearbyRun;
          column =
            index === run_endIndex(run)
              ? run_endColumn(run)
              : run_startColumn(run) + index - run_startIndex(run);
        }
        return column;
      }

      function rangeOfMapping(map) {
        if (mappings[map + mappingsOffset] !== line) return null;
        let startIndex = mappings[map + mappingsOffset + 1];
        let endIndex =
          startIndex > endOfLineIndex
            ? startIndex
            : hasTrailingNewline && startIndex < beforeNewlineIndex
            ? beforeNewlineIndex
            : endOfLineIndex;
        let isLastMappingInLine = false;

        // Ignore subsequent duplicate mappings
        if (
          map > 0 &&
          mappings[map - 6 + mappingsOffset] === line &&
          mappings[map - 6 + mappingsOffset + 1] === startIndex
        ) {
          return null;
        }

        // Skip past any duplicate mappings after us so we can get to the next non-duplicate mapping
        while (
          map + 6 < mappings.length &&
          mappings[map + 6 + mappingsOffset] === line &&
          mappings[map + 6 + mappingsOffset + 1] === startIndex
        ) {
          map += 6;
        }

        // Extend this mapping up to the next mapping if it's on the same line
        if (
          map + 6 < mappings.length &&
          mappings[map + 6 + mappingsOffset] === line
        ) {
          endIndex = mappings[map + 6 + mappingsOffset + 1];
        } else if (endIndex === startIndex) {
          isLastMappingInLine = true;
        }

        return {
          startIndex,
          startColumn: indexToColumn(startIndex),
          endIndex,
          endColumn: indexToColumn(endIndex),
          isLastMappingInLine,
        };
      }

      return {
        raw,
        index,
        column,
        firstRun,
        runBase,
        runCount,
        runText,
        firstMapping,
        endOfLineIndex,
        endOfLineColumn,
        columnToIndex,
        indexToColumn,
        rangeOfMapping,
      };
    }

    // This returns the index of the line containing the provided row. This is
    // not a 1:1 mapping when line wrapping is enabled. The residual row count
    // (i.e. how many rows are there from the start of the line) can be found
    // with "row - wrappedRows[lineIndex]".
    function lineIndexForRow(wrappedRows, row) {
      let n = lastLineIndex + 1;
      if (row > wrappedRows[n]) {
        return n + row - wrappedRows[n];
      }
      let lineIndex = 0;
      while (n > 0) {
        let step = n >> 1;
        let it = lineIndex + step;
        if (wrappedRows[it + 1] <= row) {
          lineIndex = it + 1;
          n -= step + 1;
        } else {
          n = step;
        }
      }
      return lineIndex;
    }

    function boxForRange(dx, dy, columnWidth, { startColumn, endColumn }) {
      const x1 = Math.round(dx + startColumn * columnWidth + 1);
      const x2 = Math.round(
        dx +
          (startColumn === endColumn
            ? startColumn * columnWidth + 4
            : endColumn * columnWidth) -
          1,
      );
      const y1 = Math.round(dy + 2);
      const y2 = Math.round(dy + +style.current.rowHeight - 2);
      return [x1, y1, x2, y2];
    }

    return {
      sourceIndex,
      bounds,

      updateAfterWrapChange() {
        scrollX = 0;
        computeScrollbarsAndClampScroll();
      },

      getHoverRect() {
        const lineIndex =
          sourceIndex === null
            ? hover.mapping.generatedLine
            : hover.mapping.originalLine;
        const index =
          sourceIndex === null
            ? hover.mapping.generatedColumn
            : hover.mapping.originalColumn;
        const column = analyzeLine(
          lineIndex,
          index,
          index,
          'floor',
        ).indexToColumn(index);
        const { firstMapping, rangeOfMapping } = analyzeLine(
          lineIndex,
          column,
          column,
          'floor',
        );
        const range = rangeOfMapping(firstMapping);
        if (!range) return null;
        const { x, y } = bounds();
        const { columnWidth, columnsAcross, wrappedRows } =
          computeScrollbarsAndClampScroll();

        // Compute the mouse row accounting for line wrapping
        const rowDelta = wrap ? Math.floor(column / columnsAcross) : 0;
        const row = wrappedRows[lineIndex] + rowDelta;
        const dx = x - scrollX + lineNumberWidth + textPaddingX;
        const dy = y - scrollY + textPaddingY + row * style.current.rowHeight;

        // Adjust the mouse column due to line wrapping
        let { startColumn, endColumn } = range;
        if (wrap) {
          const columnAdjustment = rowDelta * columnsAcross;
          startColumn -= columnAdjustment;
          endColumn -= columnAdjustment;
        }

        const [x1, y1, x2, y2] = boxForRange(dx, dy, columnWidth, {
          startColumn,
          endColumn,
        });
        return [x1, y1, x2 - x1, y2 - y1];
      },

      onwheel(e) {
        const { x, y, width, height } = bounds();
        const rect = canvas.getBoundingClientRect();
        const localX = e.clientX - rect.left;
        const localY = e.clientY - rect.top;
        if (
          localX >= x &&
          localX < x + width &&
          localY >= y &&
          localY < y + height
        ) {
          scrollX = Math.round(scrollX + e.deltaX);
          scrollY = Math.round(scrollY + e.deltaY);
          computeScrollbarsAndClampScroll();
          isInvalid = true;
          this.onmousemove(e);
        }
      },

      onmousemove(e: MouseEvent) {
        const scrollbarThickness = style.current.scrollbar.size;
        const { x, y, width, height } = bounds();
        const rect = canvas.getBoundingClientRect();
        const localX = e.clientX - rect.left;
        const localY = e.clientY - rect.top;
        if (
          localX >= x + lineNumberWidth &&
          localX < x + width - scrollbarThickness &&
          localY >= y &&
          localY < y + height
        ) {
          const { columnWidth, columnsAcross, wrappedRows } =
            computeScrollbarsAndClampScroll();
          let fractionalColumn =
            (localX - x - lineNumberWidth - textPaddingX + scrollX) /
            columnWidth;
          let roundedColumn = Math.round(fractionalColumn);

          if (roundedColumn >= 0) {
            const row = Math.floor(
              (localY - y - textPaddingY + scrollY) / style.current.rowHeight,
            );

            if (row >= 0) {
              // Adjust the mouse column due to line wrapping
              const lineIndex = lineIndexForRow(wrappedRows, row);
              const firstColumn =
                wrap && lineIndex < wrappedRows.length
                  ? (row - wrappedRows[lineIndex]) * columnsAcross
                  : 0;
              const lastColumn = firstColumn + columnsAcross;
              fractionalColumn += firstColumn;
              roundedColumn += firstColumn;

              const flooredColumn = Math.floor(fractionalColumn);
              const {
                index: snappedRoundedIndex,
                column: snappedRoundedColumn,
              } = analyzeLine(
                lineIndex,
                roundedColumn,
                fractionalColumn,
                'round',
              );
              const {
                index: snappedFlooredIndex,
                firstMapping,
                rangeOfMapping,
              } = analyzeLine(
                lineIndex,
                flooredColumn,
                fractionalColumn,
                'floor',
              );

              // Check to see if this nearest mapping is being hovered
              let mapping = null;
              const range = rangeOfMapping(firstMapping);
              if (
                range !== null &&
                // If this is a zero-width mapping, hit-test with the caret
                ((range.isLastMappingInLine &&
                  range.startIndex === snappedRoundedIndex) ||
                  // Otherwise, determine the bounding-box and hit-test against that
                  (snappedFlooredIndex >= range.startIndex &&
                    snappedFlooredIndex < range.endIndex &&
                    range.startColumn < lastColumn &&
                    range.endColumn > firstColumn))
              ) {
                mapping = {
                  generatedLine: mappings[firstMapping],
                  generatedColumn: mappings[firstMapping + 1],
                  originalSource: mappings[firstMapping + 2],
                  originalLine: mappings[firstMapping + 3],
                  originalColumn: mappings[firstMapping + 4],
                  originalName: mappings[firstMapping + 5],
                };
              }

              hover = {
                sourceIndex,
                lineIndex,
                row,
                column: snappedRoundedColumn,
                index: snappedRoundedIndex,
                mapping,
              };
            }
          }
        }
      },

      onmousedown(e) {
        const scrollbarThickness = style.current.scrollbar.size;
        const { x, y, width, height } = bounds();
        const rect = canvas.getBoundingClientRect();
        const localX = e.clientX - rect.left;
        const localY = e.clientY - rect.top;
        const px = localX - x;
        const py = localY - y;
        if (px < 0 || py < 0 || px >= width || py >= height) return;
        const { maxScrollX, maxScrollY, scrollbarX, scrollbarY } =
          computeScrollbarsAndClampScroll();

        // Handle scrollbar dragging
        let mousemove;
        if (scrollbarX && py > height - scrollbarThickness) {
          let originalScrollX = scrollX;
          mousemove = (e) => {
            const rect = canvas.getBoundingClientRect();
            const localXNow = e.clientX - rect.left;
            scrollX = Math.round(
              originalScrollX +
                ((localXNow - x - px) * maxScrollX) /
                  (scrollbarX.trackLength - scrollbarX.thumbLength),
            );
            computeScrollbarsAndClampScroll();
            isInvalid = true;
          };
        } else if (scrollbarY && px > width - scrollbarThickness) {
          let originalScrollY = scrollY;
          mousemove = (e) => {
            const rect = canvas.getBoundingClientRect();
            const localYNow = e.clientY - rect.top;
            scrollY = Math.round(
              originalScrollY +
                ((localYNow - y - py) * maxScrollY) /
                  (scrollbarY.trackLength - scrollbarY.thumbLength),
            );
            computeScrollbarsAndClampScroll();
            isInvalid = true;
          };
        } else {
          // Scroll to the hover target on click
          if (hover && hover.mapping) {
            if (sourceIndex !== null) {
              generatedTextArea.scrollTo(
                hover.mapping.generatedColumn,
                hover.mapping.generatedLine,
              );
            } else {
              if (
                originalTextArea.sourceIndex !== hover.mapping.originalSource
              ) {
                onSourceFileSelected(hover.mapping.originalSource);
                instance.selectSourceFile(hover.mapping.originalSource);
                Promise.resolve().then(() => {
                  originalTextArea.scrollTo(
                    hover.mapping.originalColumn,
                    hover.mapping.originalLine,
                  );
                });
              } else {
                originalTextArea.scrollTo(
                  hover.mapping.originalColumn,
                  hover.mapping.originalLine,
                );
              }
            }
          }
          return;
        }

        let mouseup = () => {
          document.removeEventListener('mousemove', mousemove);
          document.removeEventListener('mouseup', mouseup);
        };
        document.addEventListener('mousemove', mousemove);
        document.addEventListener('mouseup', mouseup);
        e.preventDefault();
      },

      scrollTo(index, line) {
        const start = Date.now();
        const startX = scrollX;
        const startY = scrollY;
        const { width, height } = bounds();
        const { columnWidth, columnsAcross, wrappedRows } =
          computeScrollbarsAndClampScroll();
        const { indexToColumn } = analyzeLine(line, index, index, 'floor');
        const column = indexToColumn(index);
        const { firstMapping, rangeOfMapping } = analyzeLine(
          line,
          column,
          column,
          'floor',
        );
        const range = rangeOfMapping(firstMapping);
        const targetColumn = range
          ? range.startColumn +
            Math.min(
              (range.endColumn - range.startColumn) / 2,
              (width - lineNumberWidth) / 4 / columnWidth,
            )
          : column;
        const endX = Math.max(
          0,
          Math.round(
            targetColumn * columnWidth - (width - lineNumberWidth) / 2,
          ),
        );
        const row = wrap
          ? wrappedRows[line] + Math.floor(column / columnsAcross)
          : line;
        const endY = Math.max(
          0,
          Math.round((row + 0.5) * style.current.rowHeight - height / 2),
        );
        if (startX === endX && startY === endY) return;
        const duration = 250;
        animate = () => {
          isInvalid = true;
          const current = Date.now();
          let t = (current - start) / duration;
          if (t >= 1) {
            scrollX = endX;
            scrollY = endY;
            animate = null;
          } else {
            t *= t * (3 - 2 * t); // Use an ease-in-out curve
            scrollX = startX + (endX - startX) * t;
            scrollY = startY + (endY - startY) * t;
          }
        };
        animate();
      },

      draw() {
        if (animate) animate();

        const scrollbarThickness = style.current.scrollbar.size;
        const hoverBoxLineThickness = style.current.hoverBox.lineWidth;
        const scrollbarColor = style.current.scrollbar.fillStyle;
        const drawRow = (dx, dy, lineIndex, firstColumn, lastColumn) => {
          const {
            raw,
            firstRun,
            runBase,
            runCount,
            runText,
            firstMapping,
            endOfLineColumn,
            rangeOfMapping,
            columnToIndex,
          } = analyzeLine(lineIndex, firstColumn, firstColumn, 'floor');
          const lastIndex = columnToIndex(lastColumn);

          // Don't draw any text if the whole line is offscreen
          if (firstRun < runCount) {
            // Scan to find the last run
            let lastRun = firstRun;
            while (
              lastRun + 1 < runCount &&
              run_startColumn(runBase + 5 * (lastRun + 1)) < lastColumn
            ) {
              lastRun++;
            }

            // Draw the runs
            const dyForText = dy + 0.7 * style.current.rowHeight;
            let currentColumn = firstColumn;
            for (let i = firstRun; i <= lastRun; i++) {
              const run = runBase + 5 * i;
              let startColumn = run_startColumn(run);
              let endColumn = run_endColumn(run);
              let whitespace = run_whitespace(run);
              let text = runText[i];

              // Lazily-generate text for runs to improve performance. When
              // this happens, the run text is the code unit offset of the
              // start of the line containing this run.
              if (text === void 0) {
                text = runText[i] = !whitespace
                  ? raw.slice(run_startIndex(run), run_endIndex(run))
                  : whitespace === 0x20 /* space */
                  ? '·'.repeat(run_endIndex(run) - run_startIndex(run))
                  : whitespace === 0x0a /* newline */
                  ? lineIndex === lines.length - 1
                    ? '∅'
                    : '↵'
                  : '→' /* tab */;
              }

              // Limit the run to the visible columns (but only for ASCII runs)
              if (!run_isSingleChunk(run)) {
                if (startColumn < currentColumn) {
                  text = text.slice(currentColumn - startColumn);
                  startColumn = currentColumn;
                }
                if (endColumn > lastColumn) {
                  text = text.slice(0, lastColumn - startColumn);
                  endColumn = lastColumn;
                }
              }

              // Draw whitespace in a separate batch
              (whitespace ? whitespaceBatch : textBatch).push(
                text,
                dx + startColumn * columnWidth,
                dyForText,
              );
              currentColumn = endColumn;
            }
          }

          // Draw the mappings
          for (let map = firstMapping; map < mappings.length; map += 6) {
            if (
              mappings[map + mappingsOffset] !== lineIndex ||
              mappings[map + mappingsOffset + 1] >= lastIndex
            )
              break;
            if (mappings[map + 2] === -1) continue;

            // Get the bounds of this mapping, which may be empty if it's ignored
            const range = rangeOfMapping(map);
            if (range === null) continue;
            const { startColumn, endColumn } = range;
            const color =
              mappings[map + 3] % style.current.sourceCodeColors.length;
            const [x1, y1, x2, y2] = boxForRange(dx, dy, columnWidth, range);

            // Check if this mapping is hovered
            let isHovered = false;
            if (hoveredMapping) {
              const isGenerated = sourceIndex === null;
              const hoverIsGenerated = hover.sourceIndex === null;
              const matchesGenerated =
                mappings[map] === hoveredMapping.generatedLine &&
                mappings[map + 1] === hoveredMapping.generatedColumn;
              const matchesOriginal =
                mappings[map + 2] === hoveredMapping.originalSource &&
                mappings[map + 3] === hoveredMapping.originalLine &&
                mappings[map + 4] === hoveredMapping.originalColumn;
              isHovered =
                hoveredMapping &&
                (isGenerated !== hoverIsGenerated
                  ? // If this is on the opposite pane from the mouse, show all
                    // mappings that match the hovered mapping instead of showing
                    // an exact match.
                    matchesGenerated || matchesOriginal
                  : // If this is on the same pane as the mouse, only show the exact
                  // mapping instead of showing everything that matches the target
                  // so hovering isn't confusing.
                  isGenerated
                  ? matchesGenerated
                  : matchesOriginal);
              if (
                isGenerated &&
                matchesGenerated &&
                hoveredMapping.originalName !== -1 &&
                !hoveredName
              ) {
                hoveredName = {
                  text: originalName(hoveredMapping.originalName),
                  x: Math.round(
                    dx +
                      range.startColumn * columnWidth -
                      hoverBoxLineThickness,
                  ),
                  y: Math.round(dy + 1.2 * style.current.rowHeight),
                };
              }
            }

            // Add a rectangle to that color's batch
            if (isHovered) {
              hoverBoxes.push({
                color,
                rect: [x1 - 2, y1 - 2, x2 - x1 + 4, y2 - y1 + 4],
              });
            } else if (
              lineIndex >= lines.length ||
              startColumn > endOfLineColumn
            ) {
              badMappingBatches[color].push(x1, y1, x2 - x1, y2 - y1);
            } else if (endColumn > endOfLineColumn) {
              let x12 = Math.round(
                x1 + (endOfLineColumn - startColumn) * columnWidth,
              );
              mappingBatches[color].push(x1, y1, x12 - x1, y2 - y1);
              badMappingBatches[color].push(x12, y1, x2 - x12, y2 - y1);
            } else {
              mappingBatches[color].push(x1, y1, x2 - x1, y2 - y1);
            }
          }
        };

        const { x, y, width, height } = bounds();
        const { textColor, backgroundColor } = style.current;
        const {
          columnWidth,
          columnsAcross,
          wrappedRows,
          maxScrollX,
          maxScrollY,
          scrollbarX,
          scrollbarY,
        } = computeScrollbarsAndClampScroll();

        // Compute the visible column/row rectangle
        const firstColumn = Math.max(
          0,
          Math.floor((scrollX - textPaddingX) / columnWidth),
        );
        const lastColumn = Math.max(
          0,
          Math.ceil(
            (scrollX -
              textPaddingX +
              width -
              lineNumberWidth -
              (wrap ? scrollbarThickness : 0)) /
              columnWidth,
          ),
        );
        const firstRow = Math.max(
          0,
          Math.floor((scrollY - textPaddingY) / style.current.rowHeight),
        );
        const lastRow = Math.max(
          0,
          Math.ceil(
            (scrollY - textPaddingY + height) / style.current.rowHeight,
          ),
        );
        const firstLineIndex = lineIndexForRow(wrappedRows, firstRow);

        // Populate batches for the text
        const hoverBoxes = [];
        const hoveredMapping = hover && hover.mapping;
        const mappingBatches = [];
        const badMappingBatches = [];
        const whitespaceBatch = [];
        const textBatch = [];
        let hoveredName = null;
        let lineIndex = firstLineIndex;
        let lineRow = wrappedRows[lineIndex];
        for (let i = 0; i < style.current.sourceCodeColors.length; i++) {
          mappingBatches.push([]);
          badMappingBatches.push([]);
        }
        for (let row = firstRow; row <= lastRow; row++) {
          const dx = x - scrollX + lineNumberWidth + textPaddingX;
          const dy = y - scrollY + textPaddingY + row * style.current.rowHeight;
          const columnAdjustment = wrap ? (row - lineRow) * columnsAcross : 0;
          drawRow(
            dx - columnAdjustment * columnWidth,
            dy,
            lineIndex,
            columnAdjustment + firstColumn,
            columnAdjustment + Math.max(firstColumn + 1, lastColumn - 1),
          );
          if (lineIndex + 1 >= wrappedRows.length) {
            lineIndex++;
            lineRow++;
          } else if (row + 1 >= wrappedRows[lineIndex + 1]) {
            lineIndex++;
            lineRow = wrappedRows[lineIndex];
          }
        }

        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, width, height);
        ctx.clip();

        // Flush batches for mappings
        for (let i = 0; i < mappingBatches.length; i++) {
          let batch = mappingBatches[i];
          if (batch.length > 0) {
            ctx.fillStyle = style.current.sourceCodeColors[i];
            for (let j = 0; j < batch.length; j += 4) {
              ctx.fillRect(batch[j], batch[j + 1], batch[j + 2], batch[j + 3]);
            }
          }
          batch = badMappingBatches[i];
          if (batch.length > 0) {
            ctx.fillStyle = badMappingPatterns[i](-scrollX, -scrollY);
            for (let j = 0; j < batch.length; j += 4) {
              ctx.fillRect(batch[j], batch[j + 1], batch[j + 2], batch[j + 3]);
            }
          }
        }

        // Draw the hover box for all text areas
        if (hoverBoxes.length > 0) {
          // Draw the glows
          ctx.shadowBlur = style.current.hoverBox.shadowBlur;
          ctx.fillStyle = style.current.hoverBox.fillStyle;
          for (const {
            rect: [rx, ry, rw, rh],
            color,
          } of hoverBoxes) {
            ctx.shadowColor = style.current.sourceCodeColors[color].replace(
              ' 0.3)',
              ' 1)',
            );
            ctx.fillRect(rx - 1, ry - 1, rw + 2, rh + 2);
          }
          ctx.shadowColor = 'transparent';

          // Hollow out the boxes and draw a border around each one
          for (const {
            rect: [rx, ry, rw, rh],
          } of hoverBoxes) {
            ctx.clearRect(rx, ry, rw, rh);
          }
          ctx.strokeStyle = style.current.hoverBox.strokeStyle;
          ctx.lineWidth = hoverBoxLineThickness;
          for (const {
            rect: [rx, ry, rw, rh],
          } of hoverBoxes) {
            ctx.strokeRect(rx, ry, rw, rh);
          }

          // Hollow out the boxes again. This is necessary to remove overlapping
          // borders from adjacent boxes due to duplicate mappings.
          for (const {
            rect: [rx, ry, rw, rh],
          } of hoverBoxes) {
            ctx.clearRect(rx + 2, ry + 1, rw - 4, rh - 2);
          }
        }

        // Draw the hover caret, but only for this text area
        else if (hover && hover.sourceIndex === sourceIndex) {
          const column =
            hover.column -
            (wrap && hover.lineIndex < wrappedRows.length
              ? columnsAcross * (hover.row - wrappedRows[hover.lineIndex])
              : 0);
          const caretX = Math.round(
            x - scrollX + lineNumberWidth + textPaddingX + column * columnWidth,
          );
          const caretY = Math.round(
            y - scrollY + textPaddingY + hover.row * style.current.rowHeight,
          );
          ctx.fillStyle = style.current.caret.textColor;
          ctx.fillRect(caretX, caretY, 1, style.current.rowHeight);
          onOtherHover({ row: hover.lineIndex + 1, col: hover.index });
          onSourceCodeHover(null);
          onMinifyCodeHover(null);
        }

        // Update the status bar
        if (hoveredMapping && hoveredMapping.originalColumn !== -1) {
          if (sourceIndex === null) {
            onMinifyCodeHover({
              row: hoveredMapping.generatedLine + 1,
              col: hoveredMapping.generatedColumn,
            });
            onOtherHover(null);
          } else {
            onSourceCodeHover({
              row: hoveredMapping.originalLine + 1,
              col: hoveredMapping.originalColumn,
              source: otherSource(hoveredMapping.originalSource),
            });
            onOtherHover(null);
          }
        }

        // Fade out wrapped mappings and hover boxes
        const wrapLeft = x + lineNumberWidth + textPaddingX;
        const wrapRight = wrapLeft + columnsAcross * columnWidth;
        if (wrap) {
          const transparentBackground = backgroundColor.replace(
            /^rgb\((\d+), (\d+), (\d+)\)$/,
            'rgba($1, $2, $3, 0)',
          );
          const leftFill = ctx.createLinearGradient(
            wrapLeft - textPaddingX,
            0,
            wrapLeft,
            0,
          );
          const rightFill = ctx.createLinearGradient(
            wrapRight + textPaddingX,
            0,
            wrapRight,
            0,
          );

          leftFill.addColorStop(0, backgroundColor);
          leftFill.addColorStop(1, transparentBackground);
          ctx.fillStyle = leftFill;
          ctx.fillRect(wrapLeft - textPaddingX, y, textPaddingX, height);

          rightFill.addColorStop(0, backgroundColor);
          rightFill.addColorStop(1, transparentBackground);
          ctx.fillStyle = rightFill;
          ctx.fillRect(wrapRight, y, x + width - wrapRight, height);
        }

        // Flush batches for the text, clipped to the wrap area (will cut emojis in half)
        ctx.textBaseline = 'alphabetic';
        ctx.textAlign = 'left';
        if (wrap) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(wrapLeft, y, wrapRight - wrapLeft, height);
          ctx.clip();
        }
        if (whitespaceBatch.length > 0) {
          ctx.fillStyle = 'rgba(150, 150, 150, 0.4)';
          for (let j = 0; j < whitespaceBatch.length; j += 3) {
            ctx.fillText(
              whitespaceBatch[j],
              whitespaceBatch[j + 1],
              whitespaceBatch[j + 2],
            );
          }
        }
        if (textBatch.length > 0) {
          ctx.fillStyle = textColor;
          for (let j = 0; j < textBatch.length; j += 3) {
            ctx.fillText(textBatch[j], textBatch[j + 1], textBatch[j + 2]);
          }
        }
        if (wrap) {
          ctx.restore();
        }

        // Draw the original name tooltip
        if (hoveredName) {
          let { text, x: nameX, y: nameY } = hoveredName;
          const w = 2 * textPaddingX + ctx.measureText(text).width;
          const h = style.current.rowHeight;
          const r = 4;
          if (wrap) {
            // Clamp the tooltip in the viewport when wrapping is enabled
            nameX = Math.max(
              wrapLeft - hoverBoxLineThickness,
              Math.min(wrapRight - w + hoverBoxLineThickness, nameX),
            );
          }
          ctx.beginPath();
          ctx.arc(nameX + r, nameY + r, r, -Math.PI, -Math.PI / 2, false);
          ctx.arc(nameX + w - r, nameY + r, r, -Math.PI / 2, 0, false);
          ctx.arc(nameX + w - r, nameY + h - r, r, 0, Math.PI / 2, false);
          ctx.arc(nameX + r, nameY + h - r, r, Math.PI / 2, Math.PI, false);
          ctx.save();
          ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
          ctx.shadowOffsetY = 3;
          ctx.shadowBlur = 10;
          ctx.fillStyle = textColor;
          ctx.fill();
          ctx.restore();
          ctx.fillStyle = backgroundColor;
          ctx.fillText(
            text,
            nameX + textPaddingX,
            nameY + 0.7 * style.current.rowHeight,
          );
        }

        // Draw the margin shadow
        if (scrollX > 0) {
          let gradient = ctx.createLinearGradient(
            x + lineNumberWidth,
            0,
            x + lineNumberWidth + shadowWidth,
            0,
          );
          for (let i = 0; i <= 10; i++) {
            let t = i / 10;
            gradient.addColorStop(
              t,
              `rgba(${style.current.scrollbar.scrollXShadowRgb.join(',')}, ${
                (1 - t) * (1 - t) * 0.2
              })`,
            );
          }
          ctx.fillStyle = gradient;
          ctx.fillRect(x + lineNumberWidth, y, shadowWidth, height);
        }

        // Draw the scrollbars
        if (scrollbarX) {
          let dx =
            x +
            lineNumberWidth +
            (scrollX / maxScrollX) *
              (scrollbarX.trackLength - scrollbarX.thumbLength);
          let dy = y + height - scrollbarThickness;
          ctx.fillStyle = scrollbarColor;
          ctx.beginPath();
          ctx.arc(
            dx + scrollbarThickness / 2,
            dy + scrollbarThickness / 2,
            scrollbarThickness / 4,
            Math.PI / 2,
            (Math.PI * 3) / 2,
            false,
          );
          ctx.arc(
            dx + scrollbarX.thumbLength - scrollbarThickness / 2,
            dy + scrollbarThickness / 2,
            scrollbarThickness / 4,
            -Math.PI / 2,
            Math.PI / 2,
            false,
          );
          ctx.fill();
        }
        if (scrollbarY) {
          let dx = x + width - scrollbarThickness;
          let dy =
            y +
            (scrollY / maxScrollY) *
              (scrollbarY.trackLength - scrollbarY.thumbLength);
          ctx.fillStyle = scrollbarColor;
          ctx.beginPath();
          ctx.arc(
            dx + scrollbarThickness / 2,
            dy + scrollbarThickness / 2,
            scrollbarThickness / 4,
            -Math.PI,
            0,
            false,
          );
          ctx.arc(
            dx + scrollbarThickness / 2,
            dy + scrollbarY.thumbLength - scrollbarThickness / 2,
            scrollbarThickness / 4,
            0,
            Math.PI,
            false,
          );
          ctx.fill();
        }

        const lineNumber = style.current.lineNumber;
        // Draw the line number
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(x, y, lineNumber.width, height);
        ctx.fillStyle = lineNumber.backgroundColor;
        ctx.fillRect(x, y, lineNumber.width, height);
        ctx.fillStyle = lineNumber.borderColor;
        ctx.fillRect(x + lineNumber.width - 1, y, 1, height);
        ctx.textAlign = 'right';
        ctx.fillStyle = lineNumber.textColor;
        ctx.font = lineNumber.font;
        for (
          let i = firstLineIndex, n = wrappedRows.length;
          i <= lastLineIndex;
          i++
        ) {
          const row =
            i < n ? wrappedRows[i] : wrappedRows[n - 1] + (i - (n - 1));
          if (row > lastRow) break;
          const dx = x + lineNumber.width - textPaddingX;
          const dy =
            y - scrollY + textPaddingY + (row + 0.6) * style.current.rowHeight;
          ctx.globalAlpha = i < lines.length ? 0.625 : 0.25;
          ctx.fillText((i + 1).toString(), dx, dy);
        }
        ctx.font = style.current.font;
        ctx.globalAlpha = 1;

        ctx.restore();
      },
    };
  }

  function draw() {
    requestAnimationFrame(draw);
    if (needResize) {
      instance.resize();
      needResize = false;
    }

    if (!isInvalid) return;
    isInvalid = false;

    ctx.clearRect(0, 0, size.width, size.height);
    if (!generatedTextArea) return;

    if (originalTextArea) {
      originalTextArea.draw();
    }
    generatedTextArea.draw();

    // Draw the arrow between the two hover areas
    if (
      hover &&
      hover.mapping &&
      originalTextArea &&
      originalTextArea.sourceIndex === hover.mapping.originalSource
    ) {
      const originalHoverRect = originalTextArea.getHoverRect();
      const generatedHoverRect = generatedTextArea.getHoverRect();
      if (originalHoverRect && generatedHoverRect) {
        const originalBounds = originalTextArea.bounds();
        const generatedBounds = generatedTextArea.bounds();
        const originalArrowHead =
          hover.sourceIndex === generatedTextArea.sourceIndex;
        const generatedArrowHead =
          hover.sourceIndex === originalTextArea.sourceIndex;
        const [ox, oy, ow, oh] = originalHoverRect;
        const [gx, gy, , gh] = generatedHoverRect;
        const x1 =
          Math.min(ox + ow, originalBounds.x + originalBounds.width) +
          (originalArrowHead ? 10 : 2);
        const x2 =
          Math.max(gx, generatedBounds.x + style.current.lineNumber.width) -
          (generatedArrowHead ? 10 : 2);
        const y1 = oy + oh / 2;
        const y2 = gy + gh / 2;

        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, size.width, size.height);
        ctx.clip();

        // Draw the curve
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.bezierCurveTo(
          (x1 + 2 * x2) / 3 + lineNumberWidth / 2,
          y1,
          (x1 * 2 + x2) / 3 - lineNumberWidth / 2,
          y2,
          x2,
          y2,
        );
        ctx.strokeStyle = style.current.hoverArrow.color;
        ctx.lineWidth = style.current.hoverArrow.lineWidth;
        ctx.stroke();

        // Draw the arrow heads
        ctx.beginPath();
        if (originalArrowHead) {
          ctx.moveTo(x1 - 10, y1);
          ctx.lineTo(x1, y1 + style.current.hoverArrow.arrowR);
          ctx.lineTo(x1, y1 - style.current.hoverArrow.arrowR);
        }
        if (generatedArrowHead) {
          ctx.moveTo(x2 + 10, y2);
          ctx.lineTo(x2, y2 + style.current.hoverArrow.arrowR);
          ctx.lineTo(x2, y2 - style.current.hoverArrow.arrowR);
        }
        ctx.fillStyle = style.current.hoverArrow.color;
        ctx.fill();

        ctx.restore();
      }
    }
  }

  draw();

  // 交互 & 事件监听
  const onmousemove = (e) => {
    let oldHover = hover;
    hover = null;

    if (originalTextArea) originalTextArea.onmousemove(e);
    if (generatedTextArea) generatedTextArea.onmousemove(e);

    if (JSON.stringify(hover) !== JSON.stringify(oldHover)) {
      isInvalid = true;
    }
  };
  const onmousedown = (e) => {
    if (originalTextArea) originalTextArea.onmousedown(e);
    if (generatedTextArea) generatedTextArea.onmousedown(e);
  };
  const onblur = () => {
    if (hover) {
      hover = null;
      isInvalid = true;
    }
  };
  const wheel = (e) => {
    e.preventDefault();
    if (originalTextArea) originalTextArea.onwheel(e);
    if (generatedTextArea) generatedTextArea.onwheel(e);
  };
  canvas.addEventListener('wheel', wheel, { passive: false });
  canvas.addEventListener('mousemove', onmousemove);
  canvas.addEventListener('mousedown', onmousedown);
  canvas.addEventListener('blur', onblur);

  // resize
  let needResize = false;
  const resizeObserver = new ResizeObserver(() => {
    needResize = true;
  });
  if (resize) {
    resizeObserver.observe(canvas.parentElement);
  }

  const instance: Instance = {
    setStyle: (st: CodeMapStyle) => {
      if (!st) {
        return;
      }
      const newStyle = deepMerge(style.current, st);
      if (JSON.stringify(newStyle) === JSON.stringify(style.current)) {
        return;
      }
      style.current = newStyle;
      if (originalTextArea) originalTextArea.updateAfterWrapChange();
      if (generatedTextArea) generatedTextArea.updateAfterWrapChange();
      isInvalid = true;
    },
    selectSourceFile: (idx: number) => {
      throw Error('Initialization failed');
    },
    wrap: (v) => {
      wrap = v;
      if (originalTextArea) originalTextArea.updateAfterWrapChange();
      if (generatedTextArea) generatedTextArea.updateAfterWrapChange();
      isInvalid = true;
    },
    destroy: () => {
      resizeObserver.disconnect();
      canvas.removeEventListener('wheel', wheel);
      canvas.removeEventListener('mousemove', onmousemove);
      canvas.removeEventListener('mousedown', onmousedown);
      canvas.removeEventListener('blur', onblur);
    },
    resize: () => {
      const width = canvas.parentElement.clientWidth;
      const height = canvas.parentElement.clientHeight;
      size = { width, height };
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      canvas.width = Math.round(width * window.devicePixelRatio);
      canvas.height = Math.round(height * window.devicePixelRatio);
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      isInvalid = true;
    },
  };

  instance.resize();
  finishLoading(code, codeMap);
  return instance;
};
