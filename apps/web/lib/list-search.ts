export function matchesQuery(haystacks: string[], query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return haystacks.some((h) => h.toLowerCase().includes(q));
}
