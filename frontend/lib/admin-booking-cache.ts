import type {
  AdminBookingDetail,
  AdminBookingListQuery,
  AdminBookingSummary,
  ApiListMeta,
} from "@/lib/api";

type BookingListEntry = {
  data: AdminBookingSummary[];
  meta: ApiListMeta;
  cachedAt: number;
};

type BookingDetailEntry = {
  data: AdminBookingDetail;
  cachedAt: number;
};

const LIST_TTL = 15_000;
const DETAIL_TTL = 45_000;
const MAX_LIST_ENTRIES = 20;
const MAX_DETAIL_ENTRIES = 40;

const listCache = new Map<string, BookingListEntry>();
const detailCache = new Map<string, BookingDetailEntry>();

function listKey(query: AdminBookingListQuery): string {
  return [
    query.date ?? "",
    query.status ?? "",
    query.businessId ?? "",
    query.customerId ?? "",
    query.from ?? "",
    query.to ?? "",
    query.page ?? 1,
    query.limit ?? 10,
  ].join("|");
}

function isFresh(cachedAt: number, ttl: number): boolean {
  return Date.now() - cachedAt < ttl;
}

function trim<T>(cache: Map<string, T>, max: number) {
  while (cache.size > max) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) return;
    cache.delete(oldest);
  }
}

export function getCachedBookingList(
  query: AdminBookingListQuery
): (BookingListEntry & { fresh: boolean }) | null {
  const cached = listCache.get(listKey(query));
  if (!cached) return null;

  return {
    ...cached,
    fresh: isFresh(cached.cachedAt, LIST_TTL),
  };
}

export function setCachedBookingList(
  query: AdminBookingListQuery,
  data: AdminBookingSummary[],
  meta: ApiListMeta
) {
  const key = listKey(query);
  listCache.delete(key);
  listCache.set(key, { data, meta, cachedAt: Date.now() });
  trim(listCache, MAX_LIST_ENTRIES);
}

export function getCachedBookingDetail(
  id: string
): (BookingDetailEntry & { fresh: boolean }) | null {
  const cached = detailCache.get(id);
  if (!cached) return null;

  return {
    ...cached,
    fresh: isFresh(cached.cachedAt, DETAIL_TTL),
  };
}

export function setCachedBookingDetail(
  id: string,
  data: AdminBookingDetail
) {
  detailCache.delete(id);
  detailCache.set(id, { data, cachedAt: Date.now() });
  trim(detailCache, MAX_DETAIL_ENTRIES);
}

export function invalidateAdminBookingCache(id?: string) {
  listCache.clear();

  if (id) {
    detailCache.delete(id);
    return;
  }

  detailCache.clear();
}
