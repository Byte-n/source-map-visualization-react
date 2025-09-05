import decodeMappings from './decodeMappings';
import generateInverseMappings from './generateInverseMappings';

/**
 * parseSourceMap
 * @param json
 */
export default function parseSourceMap (json) {
  try {
    // eslint-disable-next-line no-param-reassign
    json = JSON.parse(json);
  } catch (e) {
    console.error('JSON parse Error: ', e);
    throw new Error(`The imported source map contains invalid JSON data: ${e.message}`);
  }

  if (json.version !== 3) {
    throw new Error('The imported source map is invalid. Expected the "version" field to contain the number 3.');
  }

  if (json.sections instanceof Array) {
    const { sections } = json;
    const decodedSections = [];
    let totalDataLength = 0;

    for (let i = 0; i < sections.length; i++) {
      const { offset: { line, column }, map } = sections[i];
      if (typeof line !== 'number' || typeof column !== 'number') {
        throw new Error(`The imported source map is invalid. Expected the "offset" field for section ${i} to have a line and column.`);
      }

      if (!map) {
        throw new Error(`The imported source map is unsupported. Section ${i} does not contain a "map" field.`);
      }

      if (map.version !== 3) {
        throw new Error(`The imported source map is invalid. Expected the "version" field for section ${i} to contain the number 3.`);
      }

      if (!(map.sources instanceof Array) || map.sources.some(x => typeof x !== 'string')) {
        throw new Error(`The imported source map is invalid. Expected the "sources" field for section ${i} to be an array of strings.`);
      }

      if (typeof map.mappings !== 'string') {
        throw new Error(`The imported source map is invalid. Expected the "mappings" field for section ${i} to be a string.`);
      }

      const { sources, sourcesContent, names, mappings } = map;
      const emptyData = new Int32Array(0);
      for (let i = 0; i < sources.length; i++) {
        sources[i] = {
          name: sources[i],
          content: sourcesContent?.[i] || '',
          data: emptyData,
          dataLength: 0,
        };
      }

      const data = decodeMappings(mappings, sources.length, names ? names.length : 0);
      decodedSections.push({ offset: { line, column }, sources, names, data });
      totalDataLength += data.length;
    }

    decodedSections.sort((a, b) => {
      if (a.offset.line < b.offset.line) return -1;
      if (a.offset.line > b.offset.line) return 1;
      if (a.offset.column < b.offset.column) return -1;
      if (a.offset.column > b.offset.column) return 1;
      return 0;
    });

    const mergedData = new Int32Array(totalDataLength);
    const mergedSources = [];
    const mergedNames = [];
    let dataOffset = 0;

    for (const { offset: { line, column }, sources, names, data } of decodedSections) {
      const sourcesOffset = mergedSources.length;
      const nameOffset = mergedNames.length;

      for (let i = 0, n = data.length; i < n; i += 6) {
        if (data[i] === 0) data[i + 1] += column;
        data[i] += line;
        if (data[i + 2] !== -1) data[i + 2] += sourcesOffset;
        if (data[i + 5] !== -1) data[i + 5] += nameOffset;
      }

      mergedData.set(data, dataOffset);
      for (const source of sources) mergedSources.push(source);
      if (names) for (const name of names) mergedNames.push(name);
      dataOffset += data.length;
    }

    generateInverseMappings(mergedSources, mergedData);
    return {
      sources: mergedSources,
      names: mergedNames,
      data: mergedData,
    };
  }

  if (!(json.sources instanceof Array) || json.sources.some(x => typeof x !== 'string')) {
    throw new Error('The imported source map is invalid. Expected the "sources" field to be an array of strings.');
  }

  if (typeof json.mappings !== 'string') {
    throw new Error('The imported source map is invalid. Expected the "mappings" field to be a string.');
  }

  const { sources, sourcesContent, names, mappings } = json;
  const emptyData = new Int32Array(0);
  for (let i = 0; i < sources.length; i++) {
    sources[i] = {
      name: sources[i],
      content: sourcesContent?.[i] || '',
      data: emptyData,
      dataLength: 0,
    };
  }

  const data = decodeMappings(mappings, sources.length, names ? names.length : 0);
  generateInverseMappings(sources, data);
  return { sources, names, data };
}
