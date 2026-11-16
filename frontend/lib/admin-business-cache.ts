import type {
  AdminBusinessDetail,
  AdminBusinessListQuery,
  AdminBusinessSummary,
  ApiListMeta,
} from "@/lib/api";

type BusinessListEntry = {
  data: AdminBusinessSummary[];
  meta: ApiListMeta;
  cachedAt: number;
};

type BusinessDetailEntry = {
  data: AdminBusinessDetail;
  cachedAt: number;
};

const LIST_TTL = 20_000;
const DETAIL_TTL = 60_000;
const MAX_LIST_ENTRIES = 24;
const MAX_DETAIL_ENTRIES = 40;

const listCache = new Map<string, BusinessListEntry>();
const detailCache = new Map<string, BusinessDetailEntry>();

function listKey(query: AdminBusinessListQuery): string {
  return [
    query.q?.trim() ?? "",
    query.status ?? "",
    query.isActive === undefined ? "" : String(query.isActive),
    query.page ?? 1,
    query.limit ?? 20,
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

export function getCachedBusinessList(
  query: AdminBusinessListQuery
): (BusinessListEntry & { fresh: boolean }) | null {
  const cached = listCache.get(listKey(query));
  if (!cached) return null;

  return {
    ...cached,
    fresh: isFresh(cached.cachedAt, LIST_TTL),
  };
}

export function setCachedBusinessList(
  query: AdminBusinessListQuery,
  data: AdminBusinessSummary[],
  meta: ApiListMeta
) {
  const key = listKey(query);
  listCache.delete(key);
  listCache.set(key, { data, meta, cachedAt: Date.now() });
  trim(listCache, MAX_LIST_ENTRIES);
}

export function getCachedBusinessDetail(
  id: string
): (BusinessDetailEntry & { fresh: boolean }) | null {
  const cached = detailCache.get(id);
  if (!cached) return null;

  return {
    ...cached,
    fresh: isFresh(cached.cachedAt, DETAIL_TTL),
  };
}

export function setCachedBusinessDetail(
  id: string,
  data: AdminBusinessDetail
) {
  detailCache.delete(id);
  detailCache.set(id, { data, cachedAt: Date.now() });
  trim(detailCache, MAX_DETAIL_ENTRIES);
}

export function invalidateAdminBusinessCache(id?: string) {
  listCache.clear();

  if (id) {
    detailCache.delete(id);
    return;
  }

  detailCache.clear();
}
