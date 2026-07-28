export type PinnableEntity = {
  id: string;
  isPinned: boolean;
  pinSortOrder: number | null;
};

export function comparePinned(a: PinnableEntity, b: PinnableEntity): number {
  if (a.isPinned !== b.isPinned) {
    return a.isPinned ? -1 : 1;
  }
  if (a.isPinned && b.isPinned) {
    const aOrder = a.pinSortOrder ?? Number.MAX_SAFE_INTEGER;
    const bOrder = b.pinSortOrder ?? Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }
  }
  return a.id.localeCompare(b.id);
}

export function nextPinSortOrder<T extends PinnableEntity>(items: T[]): number {
  return (
    items.reduce((max, item) => {
      if (!item.isPinned || item.pinSortOrder === null) return max;
      return Math.max(max, item.pinSortOrder);
    }, -1) + 1
  );
}

export function movePinnedItem<T extends PinnableEntity>(
  items: T[],
  itemId: string,
  direction: "up" | "down",
): T[] {
  const pinned = items
    .filter((item) => item.isPinned)
    .slice()
    .sort(comparePinned);
  const index = pinned.findIndex((item) => item.id === itemId);
  if (index === -1) return items;
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= pinned.length) {
    return items;
  }

  const current = pinned[index]!;
  const other = pinned[swapWith]!;
  const currentOrder = current.pinSortOrder ?? index;
  const otherOrder = other.pinSortOrder ?? swapWith;

  return items.map((item) => {
    if (item.id === current.id) {
      return { ...item, pinSortOrder: otherOrder };
    }
    if (item.id === other.id) {
      return { ...item, pinSortOrder: currentOrder };
    }
    return item;
  });
}

export function pinnedTop<T extends PinnableEntity>(
  items: T[],
  limit: number,
): T[] {
  return items
    .filter((item) => item.isPinned)
    .slice()
    .sort(comparePinned)
    .slice(0, limit);
}
