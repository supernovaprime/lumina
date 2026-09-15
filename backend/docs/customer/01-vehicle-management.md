# Customer Feature: Vehicle Management

## Brief Description

Vehicle Management lets customers CRUD their vehicles. Each booking references a vehicle, so customers must register their vehicles before booking. Vehicles store make, model, year, type (SEDAN, SUV, TRUCK, etc.), size (SMALL, MEDIUM, LARGE), color, and license plate. A customer cannot delete a vehicle that has future bookings.

**Endpoints:**
- `GET /api/v1/customers/me/vehicles` — List my vehicles
- `POST /api/v1/customers/me/vehicles` — Add a vehicle
- `PATCH /api/v1/customers/me/vehicles/:id` — Update a vehicle
- `DELETE /api/v1/customers/me/vehicles/:id` — Delete a vehicle

**Auth:** CUSTOMER only (owner)
**Cost:** $0

---

## 1. What This Feature Does

### 1.1 List Vehicles
Customer sends `GET /customers/me/vehicles`. Backend returns all vehicles belonging to the authenticated customer.

### 1.2 Add Vehicle
Customer sends `POST /customers/me/vehicles { make, model, year, type, size, color, licensePlate }`. Backend validates inputs, checks license plate uniqueness per customer, creates vehicle.

### 1.3 Update Vehicle
Customer sends `PATCH /customers/me/vehicles/:id { ...fields }`. Backend validates ownership, updates fields.

### 1.4 Delete Vehicle
Customer sends `DELETE /customers/me/vehicles/:id`. Backend checks for future bookings referencing this vehicle. If any exist, rejects with ConflictException. Otherwise soft-deletes.

---

## 2. API Contracts

### 2.1 List Vehicles

```
GET /api/v1/customers/me/vehicles
Authorization: Bearer <customer-jwt>
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "make": "Toyota",
      "model": "Camry",
      "year": 2022,
      "type": "SEDAN",
      "size": "MEDIUM",
      "color": "White",
      "licensePlate": "GR-1234-22",
      "createdAt": "2026-09-01T10:00:00Z"
    }
  ]
}
```

### 2.2 Add Vehicle

```
POST /api/v1/customers/me/vehicles
Authorization: Bearer <customer-jwt>
```

**Request Body:**

```json
{
  "make": "Toyota",
  "model": "Camry",
  "year": 2022,
  "type": "SEDAN",
  "size": "MEDIUM",
  "color": "White",
  "licensePlate": "GR-1234-22"
}
```

**Response:** `201 Created`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "make": "Toyota",
    "model": "Camry",
    "year": 2022,
    "type": "SEDAN",
    "size": "MEDIUM",
    "color": "White",
    "licensePlate": "GR-1234-22"
  }
}
```

### 2.3 Update Vehicle

```
PATCH /api/v1/customers/me/vehicles/:id
Authorization: Bearer <customer-jwt>
```

**Request Body:** Same fields as add (all optional)

**Response:** `200 OK` with updated vehicle

### 2.4 Delete Vehicle

```
DELETE /api/v1/customers/me/vehicles/:id
Authorization: Bearer <customer-jwt>
```

**Response:**

```json
{
  "success": true,
  "data": { "message": "Vehicle deleted" }
}
```

---

## 3. Data Model

No new tables. Reads/writes to existing `Vehicle` table:

| Table | Columns |
|-------|---------|
| `Vehicle` | `id`, `customerId`, `make`, `model`, `year`, `type`, `size`, `color`, `licensePlate`, `createdAt` |

---

## 4. Implementation Files

### 4.1 DTOs

**`customer/dto/create-vehicle.dto.ts`**

```typescript
import { IsString, IsInt, Min, Max, Matches, IsIn } from 'class-validator';

export class CreateVehicleDto {
  @IsString() make!: string;
  @IsString() model!: string;
  @IsInt() @Min(1900) @Max(new Date().getFullYear() + 1) year!: number;
  @IsIn(['SEDAN', 'SUV', 'TRUCK', 'VAN', 'MOTORCYCLE', 'OTHER']) type!: string;
  @IsIn(['SMALL', 'MEDIUM', 'LARGE']) size!: string;
  @IsString() color!: string;
  @IsString() @Matches(/^[A-Z0-9\-]+$/i) licensePlate!: string;
}
```

### 4.2 Service — `customer/vehicle.service.ts`

```typescript
@Injectable()
export class VehicleService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(customerId: string) { ... }
  async create(customerId: string, dto: CreateVehicleDto) { ... }
  async update(customerId: string, vehicleId: string, dto: UpdateVehicleDto) { ... }
  async remove(customerId: string, vehicleId: string) { ... }
}
```

### 4.3 Controller — `customer/customer.controller.ts`

```typescript
@Controller('customers/me')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('CUSTOMER')
export class CustomerController {
  constructor(private readonly vehicleService: VehicleService) {}

  @Get('vehicles') findAll(@CurrentUser('id') customerId: string) { ... }
  @Post('vehicles') create(@CurrentUser('id') customerId: string, @Body() dto: CreateVehicleDto) { ... }
  @Patch('vehicles/:id') update(...) { ... }
  @Delete('vehicles/:id') remove(...) { ... }
}
```

### 4.4 Module — `customer/customer.module.ts`

```typescript
@Module({
  imports: [PrismaModule],
  controllers: [CustomerController],
  providers: [VehicleService],
  exports: [VehicleService],
})
export class CustomerModule {}
```

---

## 5. Validation Rules

| Field | Rule |
|-------|------|
| `year` | 1900 to current year + 1 |
| `licensePlate` | Unique per customer (not globally) |
| `type` | Enum: SEDAN, SUV, TRUCK, VAN, MOTORCYCLE, OTHER |
| `size` | Enum: SMALL, MEDIUM, LARGE |
| `make/model/color` | Non-empty strings |

---

## 6. Security Checklist

- [x] `JwtAuthGuard` — verifies JWT
- [x] `RolesGuard` — ensures `role === 'CUSTOMER'`
- [x] Ownership check — `vehicle.customerId === caller.id`
- [x] PII protection — vehicle details only visible to owner + business via active booking
- [x] Delete blocked if future bookings exist

---

## 7. File Summary

| File | Path | Purpose |
|------|------|---------|
| Controller | `src/customer/customer.controller.ts` | Route handlers |
| Service | `src/customer/vehicle.service.ts` | Vehicle CRUD logic |
| Module | `src/customer/customer.module.ts` | NestJS module wiring |
| DTO | `src/customer/dto/create-vehicle.dto.ts` | Input validation |
| DTO | `src/customer/dto/update-vehicle.dto.ts` | Input validation |
| Unit Test | `src/customer/vehicle.service.spec.ts` | Service logic tests |

**Total files: 6** (no new DB models)
