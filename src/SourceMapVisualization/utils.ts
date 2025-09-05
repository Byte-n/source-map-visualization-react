export function deepMerge <T> (obj: T, obj2: T): T {
  // 如果 obj2 是 null 或 undefined，返回 obj 的副本
  if (obj2 === null) {
    return obj ? JSON.parse(JSON.stringify(obj)) : obj2;
  }

  // 如果 obj 是 null 或 undefined，返回 obj2 的副本
  if (obj === null) {
    return JSON.parse(JSON.stringify(obj2));
  }

  // 如果两个参数都不是对象，返回 obj2
  if (typeof obj !== 'object' || typeof obj2 !== 'object') {
    return obj2;
  }

  // 如果 obj2 是数组，直接返回 obj2 的副本
  if (Array.isArray(obj2)) {
    return JSON.parse(JSON.stringify(obj2));
  }

  // 如果 obj 是数组但 obj2 不是，返回 obj2 的副本
  if (Array.isArray(obj)) {
    return JSON.parse(JSON.stringify(obj2));
  }

  // 深度合并对象
  const result = {} as T;

  // 先复制 obj 的所有属性
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      result[key] = obj[key];
    }
  }

  // 然后合并 obj2 的属性
  for (const key in obj2) {
    if (obj2.hasOwnProperty(key)) {
      if (typeof obj2[key] === 'object' && obj2[key] !== null && !Array.isArray(obj2[key]) &&
          typeof result[key] === 'object' && result[key] !== null && !Array.isArray(result[key])) {
        // 如果两个值都是对象，递归合并
        result[key] = deepMerge(result[key], obj2[key]);
      } else {
        // 否则直接覆盖
        result[key] = obj2[key];
      }
    }
  }

  return result;
}
