export interface CursorPaginationParams {
  cursor?: string;
  limit?: number;
}

export interface CursorPaginationResult<T> {
  data: T[];
  meta: {
    nextCursor?: string;
    hasMore: boolean;
    limit: number;
  };
}

export interface CursorOrderConfig {
  field: string;
  direction?: 'asc' | 'desc';
}

export function buildCursorWhere(
  cursor: string | undefined,
  orderConfigs: CursorOrderConfig[],
): string {
  if (!cursor) return '';

  const conditions = orderConfigs.map((cfg, idx) => {
    const dir = cfg.direction ?? 'asc';
    if (dir === 'asc') {
      return `"${cfg.field}" > $cursor_${idx}`;
    }
    return `"${cfg.field}" < $cursor_${idx}`;
  });

  return `(${conditions.join(' AND ')})`;
}

export function parseCursorValue(cursor: string): string[] {
  try {
    return JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
  } catch {
    return [cursor];
  }
}

export function encodeCursor(values: string[]): string {
  return Buffer.from(JSON.stringify(values)).toString('base64');
}

export function createCursorPagination<T>(
  data: T[],
  limit: number,
  getCursorValues: (item: T) => string[],
): CursorPaginationResult<T> {
  const hasMore = data.length > limit;
  const items = hasMore ? data.slice(0, limit) : data;

  const nextCursor = hasMore && items.length > 0
    ? encodeCursor(getCursorValues(items[items.length - 1]))
    : undefined;

  return {
    data: items,
    meta: {
      nextCursor,
      hasMore,
      limit,
    },
  };
}

export function applyCursorPagination<T>(
  allData: T[],
  limit: number,
  cursor?: string,
  getCursorValues: (item: T) => string[] = (item: any) => [item.id],
): CursorPaginationResult<T> {
  let filtered = allData;

  if (cursor) {
    const cursorValues = parseCursorValue(cursor);
    const cursorId = cursorValues[0];

    const idx = allData.findIndex((item: any) => item.id === cursorId);
    if (idx !== -1) {
      filtered = allData.slice(idx + 1);
    } else {
      filtered = [];
    }
  }

  const hasMore = filtered.length > limit;
  const items = hasMore ? filtered.slice(0, limit) : filtered;

  const nextCursor = hasMore && items.length > 0
    ? encodeCursor(getCursorValues(items[items.length - 1]))
    : undefined;

  return {
    data: items,
    meta: {
      nextCursor,
      hasMore,
      limit,
    },
  };
}
