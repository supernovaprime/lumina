import {
  encodeCursor,
  parseCursorValue,
  applyCursorPagination,
  createCursorPagination,
} from './cursor-pagination';

describe('CursorPagination', () => {
  describe('encodeCursor', () => {
    it('encodes values to base64', () => {
      const cursor = encodeCursor(['id-123']);
      expect(typeof cursor).toBe('string');
      expect(cursor.length).toBeGreaterThan(0);
    });

    it('encodes multiple values', () => {
      const cursor = encodeCursor(['id-1', '2026-01-01']);
      const decoded = parseCursorValue(cursor);
      expect(decoded).toEqual(['id-1', '2026-01-01']);
    });
  });

  describe('parseCursorValue', () => {
    it('decodes base64 cursor', () => {
      const cursor = encodeCursor(['b005']);
      const decoded = parseCursorValue(cursor);
      expect(decoded).toEqual(['b005']);
    });

    it('returns raw value on decode failure', () => {
      const decoded = parseCursorValue('not-a-cursor');
      expect(decoded).toEqual(['not-a-cursor']);
    });
  });

  describe('applyCursorPagination', () => {
    const items = [
      { id: 'b001', name: 'A' },
      { id: 'b002', name: 'B' },
      { id: 'b003', name: 'C' },
      { id: 'b004', name: 'D' },
      { id: 'b005', name: 'E' },
    ];

    it('returns first page without cursor', () => {
      const result = applyCursorPagination(items, 2);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].id).toBe('b001');
      expect(result.data[1].id).toBe('b002');
      expect(result.meta.hasMore).toBe(true);
      expect(result.meta.nextCursor).toBeDefined();
    });

    it('returns all items when limit exceeds data', () => {
      const result = applyCursorPagination(items, 10);
      expect(result.data).toHaveLength(5);
      expect(result.meta.hasMore).toBe(false);
      expect(result.meta.nextCursor).toBeUndefined();
    });

    it('paginates using cursor', () => {
      const cursor = encodeCursor(['b002']);
      const result = applyCursorPagination(items, 2, cursor);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].id).toBe('b003');
      expect(result.data[1].id).toBe('b004');
    });

    it('returns last page correctly', () => {
      const cursor = encodeCursor(['b004']);
      const result = applyCursorPagination(items, 2, cursor);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('b005');
      expect(result.meta.hasMore).toBe(false);
      expect(result.meta.nextCursor).toBeUndefined();
    });

    it('returns empty when cursor is beyond data', () => {
      const cursor = encodeCursor(['b999']);
      const result = applyCursorPagination(items, 2, cursor);
      expect(result.data).toHaveLength(0);
      expect(result.meta.hasMore).toBe(false);
    });

    it('includes limit in meta', () => {
      const result = applyCursorPagination(items, 3);
      expect(result.meta.limit).toBe(3);
    });
  });

  describe('createCursorPagination', () => {
    it('creates pagination from pre-sliced data', () => {
      const items = [{ id: 'a' }, { id: 'b' }];
      const result = createCursorPagination(items, 10, (item) => [item.id]);
      expect(result.data).toHaveLength(2);
      expect(result.meta.hasMore).toBe(false);
    });

    it('marks hasMore when data exceeds limit', () => {
      const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
      const result = createCursorPagination(items, 2, (item) => [item.id]);
      expect(result.data).toHaveLength(2);
      expect(result.meta.hasMore).toBe(true);
      expect(result.meta.nextCursor).toBeDefined();
    });
  });
});
