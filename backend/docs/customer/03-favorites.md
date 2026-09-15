# Customer Feature: Favorites

## Brief Description

Favorites let customers save businesses they like for quick access. Adding a favorite is idempotent (upsert on composite unique). Listing favorites shows business summary + next available slot for quick re-booking.

**Endpoints:**
- `GET /api/v1/customers/me/favorites` — List my favorites
- `PUT /api/v1/customers/me/favorites/:businessId` — Add/save business
- `DELETE /api/v1/customers/me/favorites/:businessId` — Remove favorite

**Auth:** CUSTOMER only (owner)
**Cost:** $0

---

## 1. What This Feature Does

### 1.1 List Favorites
Customer sends `GET /customers/me/favorites`. Backend returns all favorited businesses with summary info (name, rating, city, logo).

### 2.2 Add Favorite
Customer sends `PUT /customers/me/favorites/:businessId`. Backend upserts (idempotent — no error if already favorited). Returns the favorite.

### 2.3 Remove Favorite
Customer sends `DELETE /customers/me/favorites/:businessId`. Backend deletes the favorite. No error if not found (idempotent delete).

---

## 2. API Contracts

### 2.1 List Favorites

```
GET /api/v1/customers/me/favorites
Authorization: Bearer <customer-jwt>
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "businessId": "uuid",
      "createdAt": "2026-09-01T10:00:00Z",
      "business": {
        "id": "uuid",
        "name": "Quick Wash Pro",
        "city": "Accra",
        "state": "Greater Accra",
        "rating": 4.5,
        "reviewCount": 20,
        "logo": "logos/b1/logo.png"
      }
    }
  ]
}
```

### 2.2 Add Favorite

```
PUT /api/v1/customers/me/favorites/:businessId
Authorization: Bearer <customer-jwt>
```

**Response:** `200 OK` (upserted favorite)

### 2.3 Remove Favorite

```
DELETE /api/v1/customers/me/favorites/:businessId
Authorization: Bearer <customer-jwt>
```

**Response:**

```json
{
  "success": true,
  "data": { "message": "Favorite removed" }
}
```

---

## 3. Data Model

No new tables. Reads/writes to existing `Favorite` table:

| Table | Columns |
|-------|---------|
| `Favorite` | `id`, `customerId`, `businessId`, `createdAt` |

Unique constraint: `@@unique([customerId, businessId])`

---

## 4. Implementation Files

### 4.1 Service — `customer/favorite.service.ts`

```typescript
@Injectable()
export class FavoriteService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(customerId: string) {
    return this.prisma.favorite.findMany({
      where: { customerId },
      include: { business: { select: { id, name, city, state, rating, reviewCount, logo } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async add(customerId: string, businessId: string) {
    const favorite = await this.prisma.favorite.upsert({
      where: { customerId_businessId: { customerId, businessId } },
      update: {},
      create: { customerId, businessId },
      include: { business: true },
    });
    return favorite;
  }

  async remove(customerId: string, businessId: string) {
    await this.prisma.favorite.deleteMany({
      where: { customerId, businessId },
    });
  }
}
```

### 4.2 Controller — `customer/customer.controller.ts`

```typescript
@Get('favorites')
findAll(@CurrentUser('id') customerId: string) {
  return this.favoriteService.findAll(customerId);
}

@Put('favorites/:businessId')
add(@CurrentUser('id') customerId: string, @Param('businessId') businessId: string) {
  return this.favoriteService.add(customerId, businessId);
}

@Delete('favorites/:businessId')
remove(@CurrentUser('id') customerId: string, @Param('businessId') businessId: string) {
  return this.favoriteService.remove(customerId, businessId);
}
```

---

## 5. Security Checklist

- [x] `JwtAuthGuard` — verifies JWT
- [x] `RolesGuard` — ensures `role === 'CUSTOMER'`
- [x] Ownership — queries always use `customerId === caller.id`
- [x] Add is idempotent (upsert)
- [x] Remove is idempotent (deleteMany)

---

## 6. File Summary

| File | Path | Purpose |
|------|------|---------|
| Controller | `src/customer/customer.controller.ts` | Route handlers |
| Service | `src/customer/favorite.service.ts` | Favorites logic |
| DTO | None needed | Path param only |
| Unit Test | `src/customer/favorite.service.spec.ts` | Service tests |

**Total files: 3** (no new DB models)
