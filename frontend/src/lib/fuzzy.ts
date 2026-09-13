/**
 * Tiny subsequence fuzzy matcher for the component search. Deterministic and dependency-free:
 * every query character must appear in order; scores reward consecutive and word-start hits.
 */
export function fuzzyScore(query: string, target: string): number | null {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return 0;
  const haystack = target.toLowerCase();

  let score = 0;
  let targetIndex = 0;
  let previousMatch = -1;

  for (const character of needle) {
    const matchIndex = haystack.indexOf(character, targetIndex);
    if (matchIndex === -1) return null;

    if (matchIndex === previousMatch + 1) score += 4;
    if (matchIndex === 0 || /[\s_\-.]/.test(haystack[matchIndex - 1] ?? "")) score += 6;
    score += 1;

    previousMatch = matchIndex;
    targetIndex = matchIndex + 1;
  }

  return score - haystack.length * 0.01;
}

export function fuzzyFilter<T>(
  query: string,
  items: T[],
  keyOf: (item: T) => string,
  limit = 40,
): T[] {
  if (query.trim().length === 0) return items.slice(0, limit);
  return items
    .map((item) => ({ item, score: fuzzyScore(query, keyOf(item)) }))
    .filter((entry): entry is { item: T; score: number } => entry.score !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.item);
}
