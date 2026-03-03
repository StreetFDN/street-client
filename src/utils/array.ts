export function chunkArray<T>(items: T[], size: number): T[][] {
  if (size <= 0) {
    return [];
  }
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

export function uniqueBy<T, K>(
  items: readonly T[],
  selector: (item: T) => K,
): T[] {
  const uniques = new Map<string, T>();
  for (const item of items) {
    const strKey = JSON.stringify(selector(item));
    uniques.set(strKey, item);
  }
  return [...uniques.values()];
}
