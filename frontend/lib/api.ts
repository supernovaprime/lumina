import { getAccessToken } from "@/lib/auth";

const rawBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:7000/api/v1";

export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, "");

type ApiErrorBody = {
  code?: string;
  message?: string | string[];
  details?: unknown;
  requestId?: string;
};

type ApiErrorResponse = {
  success: false;
  error?: ApiErrorBody;
};

type ApiSuccessResponse<T> = {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(
    message: string,
    options: { status: number; code?: string; details?: unknown }
  ) {
    super(message);
    this.name = "ApiError";
    this.status = options.status;
    this.code = options.code;
    this.details = options.details;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;

  const accessToken = getAccessToken();

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError(
      "We couldn't reach the Lumina server. Check your connection and try again.",
      { status: 0, code: "NETWORK_ERROR" }
    );
  }

  const text = await response.text();
  let payload: unknown;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = undefined;
    }
  }

  if (!response.ok) {
    const body = payload as ApiErrorResponse | undefined;
    const error = body?.error;
    const rawMessage = error?.message;
    const message = Array.isArray(rawMessage)
      ? rawMessage.join(", ")
      : rawMessage;

    throw new ApiError(
      message || `Request failed with status ${response.status}.`,
      {
        status: response.status,
        code: error?.code,
        details: error?.details ?? (Array.isArray(rawMessage) ? rawMessage : undefined),
      }
    );
  }

  const success = payload as ApiSuccessResponse<T> | undefined;

  if (!success || typeof success !== "object" || !("data" in success)) {
    throw new ApiError("Unexpected response from the Lumina server.", {
      status: response.status,
      code: "INVALID_RESPONSE",
    });
  }

  return success.data;
}

export type RegisterCustomerInput = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
};

export type RegisterCustomerResult = {
  userId: string;
  email: string;
  requiresVerification: boolean;
};

export function registerCustomer(input: RegisterCustomerInput) {
  return request<RegisterCustomerResult>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export type UserRole = "CUSTOMER" | "BUSINESS" | "ADMIN";

export type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type LoginResult = {
  user: AuthUser;
  customer?: Record<string, unknown> | null;
  business?: Record<string, unknown> | null;
  accessToken: string;
};

export function login(input: LoginInput) {
  return request<LoginResult>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// ─── Admin ─────────────────────────────────────────────────────

export type ApiListMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type ApiList<T> = {
  data: T[];
  meta: ApiListMeta;
};

export type ApiItem<T> = {
  data: T;
};

function toQuery(params: object): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}

export type AdminDashboardMetrics = {
  bookingsToday: number;
  revenueMTD: number | string;
  activeBusinesses: number;
  pendingVerifications: number;
  totalUsers: number;
};

export function getAdminDashboard() {
  return request<AdminDashboardMetrics>("/admin/dashboard");
}

export type AdminServiceSummary = {
  id: string;
  name: string;
  category: string;
  basePrice: number | string;
  durationMinutes: number;
  isActive: boolean;
};

export type AdminUserSummary = {
  id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  customer: {
    firstName: string;
    lastName: string;
    phone: string | null;
    vehicleCount: number;
    bookingCount: number;
  } | null;
  business: {
    name: string;
    serviceCount: number;
    bookingCount: number;
  } | null;
};

export type AdminUserDetail = Omit<AdminUserSummary, "customer" | "business"> & {
  customer:
    | (NonNullable<AdminUserSummary["customer"]> & {
        vehicles: Record<string, unknown>[];
        recentBookings: Record<string, unknown>[];
        reviewCount: number;
        favoriteCount: number;
      })
    | null;
  business:
    | (NonNullable<AdminUserSummary["business"]> & {
        services: AdminServiceSummary[];
        reviewCount: number;
      })
    | null;
};

export type AdminUserListQuery = {
  role?: UserRole;
  q?: string;
  page?: number;
  limit?: number;
  sortBy?: "createdAt" | "email" | "lastLoginAt";
  sortOrder?: "asc" | "desc";
};

export type AdminUserStatusResult = {
  id: string;
  isActive: boolean;
  message: string;
  sessionsRevoked?: boolean;
  bookingsCancelled?: number;
};

export function listAdminUsers(query: AdminUserListQuery = {}) {
  return request<ApiList<AdminUserSummary>>(`/admin/users${toQuery(query)}`);
}

export function getAdminUser(id: string) {
  return request<ApiItem<AdminUserDetail>>(`/admin/users/${id}`);
}

export function activateAdminUser(id: string) {
  return request<ApiItem<AdminUserStatusResult>>(`/admin/users/${id}/activate`, {
    method: "PUT",
  });
}

export function deactivateAdminUser(id: string, reason?: string) {
  return request<ApiItem<AdminUserStatusResult>>(`/admin/users/${id}/deactivate`, {
    method: "PUT",
    body: JSON.stringify({ reason }),
  });
}

export type VerificationStatus = "PENDING" | "APPROVED" | "REJECTED";

export type AdminBusinessSummary = {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  logo: string | null;
  coverImage: string | null;
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  isActive: boolean;
  verificationStatus: VerificationStatus;
  verifiedAt: string | null;
  verifiedBy: string | null;
  rejectionReason: string | null;
  timezone: string;
  createdAt: string;
  updatedAt: string;
  owner: { id: string; email: string };
  _count: { services: number; bookings: number };
};

export type AdminBusinessDetail = Omit<AdminBusinessSummary, "_count"> & {
  services: AdminServiceSummary[];
  totalRevenue: number | string;
  _count: { bookings: number; reviews: number };
};

export type AdminBusinessListQuery = {
  status?: VerificationStatus;
  isActive?: boolean;
  q?: string;
  page?: number;
  limit?: number;
};

export type AdminVerifyBusinessInput = {
  action: "APPROVE" | "REJECT";
  reason?: string;
};

export function listAdminBusinesses(query: AdminBusinessListQuery = {}) {
  return request<ApiList<AdminBusinessSummary>>(
    `/admin/businesses${toQuery(query)}`
  );
}

export function getAdminBusiness(id: string) {
  return request<ApiItem<AdminBusinessDetail>>(`/admin/businesses/${id}`);
}

export function verifyAdminBusiness(
  id: string,
  input: AdminVerifyBusinessInput
) {
  return request<ApiItem<{ id: string; verificationStatus: VerificationStatus }>>(
    `/admin/businesses/${id}/verify`,
    {
      method: "PUT",
      body: JSON.stringify(input),
    }
  );
}

export function deactivateAdminBusiness(id: string, reason?: string) {
  return request<ApiItem<{ id: string; isActive: boolean; message: string }>>(
    `/admin/businesses/${id}/deactivate`,
    {
      method: "PUT",
      body: JSON.stringify({ reason }),
    }
  );
}

export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "REFUNDED";

export type PaymentStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "REFUNDED"
  | "PARTIAL_REFUNDED";

export type AdminBookingSummary = {
  id: string;
  date: string;
  timeSlot: string;
  status: BookingStatus;
  totalPrice: number | string;
  notes: string | null;
  cancelledAt: string | null;
  cancelledBy: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
  customer: { firstName: string; lastName: string; phone: string | null };
  business: { name: string; city: string };
  service: { name: string; basePrice: number | string };
  vehicle: { make: string; model: string; licensePlate: string };
  payment: { status: PaymentStatus; amount: number | string } | null;
};

export type AdminBookingDetail = Omit<
  AdminBookingSummary,
  "customer" | "business" | "service" | "vehicle" | "payment"
> & {
  customer: AdminBookingSummary["customer"] & { user: { email: string } };
  business: AdminBookingSummary["business"] & { owner: { email: string } };
  service: AdminServiceSummary;
  vehicle: AdminBookingSummary["vehicle"] & {
    year: number;
    color: string | null;
    type: string;
    size: string;
  };
  payment: AdminBookingSummary["payment"];
  review: {
    id: string;
    rating: number;
    comment: string | null;
    isHidden: boolean;
    hiddenReason: string | null;
  } | null;
};

export type AdminBookingListQuery = {
  date?: string;
  status?: BookingStatus;
  businessId?: string;
  customerId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
};

export function listAdminBookings(query: AdminBookingListQuery = {}) {
  return request<ApiList<AdminBookingSummary>>(
    `/admin/bookings${toQuery(query)}`
  );
}

export function getAdminBooking(id: string) {
  return request<ApiItem<AdminBookingDetail>>(`/admin/bookings/${id}`);
}

export function cancelAdminBooking(id: string, reason: string) {
  return request<ApiItem<{ id: string; status: BookingStatus; message: string }>>(
    `/admin/bookings/${id}`,
    {
      method: "DELETE",
      body: JSON.stringify({ reason }),
    }
  );
}

export type AdminReviewSummary = {
  id: string;
  bookingId: string;
  rating: number;
  comment: string | null;
  response: string | null;
  isHidden: boolean;
  hiddenReason: string | null;
  createdAt: string;
  customer: {
    firstName: string;
    lastName: string;
    user: { email: string };
  };
  business: { name: string };
};

export type AdminReviewListQuery = {
  isHidden?: boolean;
  businessId?: string;
  minRating?: number;
  maxRating?: number;
  page?: number;
  limit?: number;
};

export function listAdminReviews(query: AdminReviewListQuery = {}) {
  return request<ApiList<AdminReviewSummary>>(
    `/admin/reviews${toQuery(query)}`
  );
}

export function hideAdminReview(id: string, reason: string) {
  return request<ApiItem<{ id: string; isHidden: boolean }>>(
    `/admin/reviews/${id}/hide`,
    {
      method: "PATCH",
      body: JSON.stringify({ reason }),
    }
  );
}

export function unhideAdminReview(id: string) {
  return request<ApiItem<{ id: string; isHidden: boolean }>>(
    `/admin/reviews/${id}/unhide`,
    {
      method: "PATCH",
    }
  );
}

export type AdminReportType = "bookings" | "revenue" | "businesses" | "users";
export type AdminReportStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export type AdminReportJob = {
  jobId: string;
  type?: AdminReportType | string;
  status: AdminReportStatus;
  downloadUrl?: string | null;
  expiresAt?: string | null;
  rowcount?: number | null;
  createdAt?: string;
  completedAt?: string | null;
  error?: string | null;
};

export type AdminReportQuery = {
  from: string;
  to: string;
  type: AdminReportType;
  businessId?: string;
};

export function generateAdminReport(query: AdminReportQuery) {
  return request<ApiItem<AdminReportJob>>(`/admin/reports${toQuery(query)}`);
}

export function getAdminReportStatus(jobId: string) {
  return request<ApiItem<AdminReportJob>>(`/admin/reports/${jobId}`);
}

export type AdminAuditEntry = {
  id: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: unknown;
  createdAt: string;
};

export type AdminAuditQuery = {
  entity?: string;
  action?: string;
  actorId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
};

export function listAdminAudit(query: AdminAuditQuery = {}) {
  return request<ApiList<AdminAuditEntry>>(`/admin/audit${toQuery(query)}`);
}
