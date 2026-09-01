import type {
  Post,
  PostListResponse,
  Faq,
  Expense,
  ExpenseListResponse,
  StatsResponse,
  Patient,
  PatientDetail,
  PatientListResponse,
  Booking,
  Package,
  PatientPackage,
  Payment,
  PaymentListResponse,
  PaymentMethod,
  PaymentSource,
  AppointmentRequest,
  RequestStatus,
  TodayResponse,
} from "@/types";

// Server-side (SSR/SSG): Docker internal hostname
// Client-side (browser): empty string → relative URL → nginx proxies /api/* to backend
const API_URL =
  typeof window === "undefined"
    ? process.env.BACKEND_URL ?? "http://localhost:5000"
    : "";

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, options);
  if (!res.ok) {
    if (res.status === 401) throw new UnauthorizedError();
    const error = await res.json().catch(() => ({ message: "API error" }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ─── Upload ────────────────────────────────────────────────────

export async function adminUploadImage(
  file: File,
  token: string,
): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append("image", file);
  const res = await fetch("/api/admin/upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) {
    if (res.status === 401) {
      window.location.replace("/admin/login");
      throw new UnauthorizedError();
    }
    const error = await res.json().catch(() => ({ message: "Yükleme başarısız" }));
    throw new Error(error.message);
  }
  return res.json();
}

// ─── Public ────────────────────────────────────────────────────

export function getTags(): Promise<string[]> {
  return apiFetch<string[]>("/api/posts/tags");
}

export function getPosts(page = 1, tag?: string): Promise<PostListResponse> {
  const params = new URLSearchParams({ page: String(page) });
  if (tag) params.set("tag", tag);
  return apiFetch<PostListResponse>(`/api/posts?${params}`);
}

export function getPost(slug: string): Promise<Post> {
  return apiFetch<Post>(`/api/posts/${slug}`);
}

export function getRelatedPosts(slug: string): Promise<Post[]> {
  return apiFetch<Post[]>(`/api/posts/${slug}/related`);
}

export function getFaqs(): Promise<Faq[]> {
  return apiFetch<Faq[]>("/api/faqs");
}

export function submitAppointment(data: {
  name: string;
  email: string;
  phone: string;
}): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>("/api/appointment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

// ─── Admin ─────────────────────────────────────────────────────

async function adminFetch<T>(
  path: string,
  token: string,
  options?: RequestInit,
): Promise<T> {
  try {
    return await apiFetch<T>(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options?.headers ?? {}),
      },
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      window.location.replace("/admin/login");
    }
    throw err;
  }
}

export function adminGetPosts(token: string) {
  return adminFetch<Post[]>("/api/admin/posts", token);
}

export function adminGetPost(id: string, token: string) {
  return adminFetch<Post>(`/api/admin/posts/${id}`, token);
}

export function adminCreatePost(data: Partial<Post>, token: string) {
  return adminFetch<Post>("/api/admin/posts", token, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function adminUpdatePost(
  id: string,
  data: Partial<Post>,
  token: string,
) {
  return adminFetch<Post>(`/api/admin/posts/${id}`, token, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function adminDeletePost(id: string, token: string) {
  return adminFetch<{ message: string }>(`/api/admin/posts/${id}`, token, {
    method: "DELETE",
  });
}

export function adminGetFaqs(token: string) {
  return adminFetch<Faq[]>("/api/admin/faqs", token);
}

export function adminCreateFaq(data: Partial<Faq>, token: string) {
  return adminFetch<Faq>("/api/admin/faqs", token, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function adminUpdateFaq(id: string, data: Partial<Faq>, token: string) {
  return adminFetch<Faq>(`/api/admin/faqs/${id}`, token, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function adminDeleteFaq(id: string, token: string) {
  return adminFetch<{ message: string }>(`/api/admin/faqs/${id}`, token, {
    method: "DELETE",
  });
}

// ─── Randevular & İstatistik ───────────────────────────────────

export function adminGetExpenses(
  token: string,
  params?: { from?: string; to?: string },
) {
  const q = new URLSearchParams();
  if (params?.from) q.set("from", params.from);
  if (params?.to) q.set("to", params.to);
  const qs = q.toString();
  return adminFetch<ExpenseListResponse>(
    `/api/admin/expenses${qs ? `?${qs}` : ""}`,
    token,
  );
}

export function adminCreateExpense(data: Partial<Expense>, token: string) {
  return adminFetch<Expense>("/api/admin/expenses", token, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function adminUpdateExpense(
  id: string,
  data: Partial<Expense>,
  token: string,
) {
  return adminFetch<Expense>(`/api/admin/expenses/${id}`, token, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function adminDeleteExpense(id: string, token: string) {
  return adminFetch<{ message: string }>(`/api/admin/expenses/${id}`, token, {
    method: "DELETE",
  });
}

export function adminGetStats(
  token: string,
  params?: { from?: string; to?: string },
) {
  const q = new URLSearchParams();
  if (params?.from) q.set("from", params.from);
  if (params?.to) q.set("to", params.to);
  const qs = q.toString();
  return adminFetch<StatsResponse>(
    `/api/admin/stats${qs ? `?${qs}` : ""}`,
    token,
  );
}

// ─── Hastalar (Patient) ────────────────────────────────────────

export function adminGetPatients(
  token: string,
  params?: { q?: string; page?: number; limit?: number },
) {
  const q = new URLSearchParams();
  if (params?.q) q.set("q", params.q);
  if (params?.page) q.set("page", String(params.page));
  if (params?.limit) q.set("limit", String(params.limit));
  const qs = q.toString();
  return adminFetch<PatientListResponse>(
    `/api/admin/patients${qs ? `?${qs}` : ""}`,
    token,
  );
}

export function adminGetPatient(id: string, token: string) {
  return adminFetch<PatientDetail>(`/api/admin/patients/${id}`, token);
}

export function adminCreatePatient(data: Partial<Patient>, token: string) {
  return adminFetch<Patient>("/api/admin/patients", token, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function adminUpdatePatient(
  id: string,
  data: Partial<Patient>,
  token: string,
) {
  return adminFetch<Patient>(`/api/admin/patients/${id}`, token, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function adminDeletePatient(id: string, token: string) {
  return adminFetch<{ message: string }>(`/api/admin/patients/${id}`, token, {
    method: "DELETE",
  });
}

// ─── Randevular / Takvim (Booking) ─────────────────────────────

export function adminGetBookings(
  token: string,
  params?: { from?: string; to?: string },
) {
  const q = new URLSearchParams();
  if (params?.from) q.set("from", params.from);
  if (params?.to) q.set("to", params.to);
  const qs = q.toString();
  return adminFetch<Booking[]>(
    `/api/admin/bookings${qs ? `?${qs}` : ""}`,
    token,
  );
}

// data.patient = patientId (string)
export function adminCreateBooking(
  data: {
    patient: string;
    date: string;
    time?: string;
    status?: string;
    cancelReason?: string | null;
    note?: string;
  },
  token: string,
) {
  return adminFetch<Booking>("/api/admin/bookings", token, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function adminUpdateBooking(
  id: string,
  data: {
    patient?: string;
    date?: string;
    time?: string;
    status?: string;
    cancelReason?: string | null;
    note?: string;
  },
  token: string,
) {
  return adminFetch<Booking>(`/api/admin/bookings/${id}`, token, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function adminDeleteBooking(id: string, token: string) {
  return adminFetch<{ message: string }>(`/api/admin/bookings/${id}`, token, {
    method: "DELETE",
  });
}

// ─── Randevu sonuçlandırma ─────────────────────────────────────

export function adminCompleteBooking(
  id: string,
  data: {
    status: "geldi" | "gelmedi" | "iptal";
    fee?: number;
    patientPackage?: string | null;
    cancelReason?: string | null;
    payment?: {
      amount: number;
      method: PaymentMethod;
      documentNumber?: string;
    };
  },
  token: string,
) {
  return adminFetch<Booking>(`/api/admin/bookings/${id}/complete`, token, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ─── Paket katalogu ────────────────────────────────────────────

export function adminGetPackages(token: string, activeOnly = false) {
  return adminFetch<Package[]>(
    `/api/admin/packages${activeOnly ? "?activeOnly=true" : ""}`,
    token,
  );
}

export function adminCreatePackage(data: Partial<Package>, token: string) {
  return adminFetch<Package>("/api/admin/packages", token, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function adminUpdatePackage(
  id: string,
  data: Partial<Package>,
  token: string,
) {
  return adminFetch<Package>(`/api/admin/packages/${id}`, token, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function adminDeletePackage(id: string, token: string) {
  return adminFetch<{ message: string }>(`/api/admin/packages/${id}`, token, {
    method: "DELETE",
  });
}

// ─── Satılan paketler ──────────────────────────────────────────

export function adminGetPatientPackages(
  token: string,
  params?: { patient?: string; from?: string; to?: string },
) {
  const q = new URLSearchParams();
  if (params?.patient) q.set("patient", params.patient);
  if (params?.from) q.set("from", params.from);
  if (params?.to) q.set("to", params.to);
  const qs = q.toString();
  return adminFetch<PatientPackage[]>(
    `/api/admin/patient-packages${qs ? `?${qs}` : ""}`,
    token,
  );
}

export function adminCreatePatientPackage(
  data: {
    patient: string;
    package?: string | null;
    name: string;
    sessionCount: number;
    price: number;
    soldAt: string;
    note?: string;
  },
  token: string,
) {
  return adminFetch<PatientPackage>("/api/admin/patient-packages", token, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function adminDeletePatientPackage(id: string, token: string) {
  return adminFetch<{ message: string }>(
    `/api/admin/patient-packages/${id}`,
    token,
    { method: "DELETE" },
  );
}

// ─── Tahsilatlar ───────────────────────────────────────────────

export function adminGetPayments(
  token: string,
  params?: { from?: string; to?: string; patient?: string },
) {
  const q = new URLSearchParams();
  if (params?.from) q.set("from", params.from);
  if (params?.to) q.set("to", params.to);
  if (params?.patient) q.set("patient", params.patient);
  const qs = q.toString();
  return adminFetch<PaymentListResponse>(
    `/api/admin/payments${qs ? `?${qs}` : ""}`,
    token,
  );
}

export interface PaymentInput {
  patient: string;
  source: PaymentSource;
  booking?: string | null;
  patientPackage?: string | null;
  amount: number;
  method: PaymentMethod;
  date: string;
  documentNumber?: string;
  note?: string;
}

export function adminCreatePayment(data: PaymentInput, token: string) {
  return adminFetch<Payment>("/api/admin/payments", token, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function adminUpdatePayment(
  id: string,
  data: PaymentInput,
  token: string,
) {
  return adminFetch<Payment>(`/api/admin/payments/${id}`, token, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function adminDeletePayment(id: string, token: string) {
  return adminFetch<{ message: string }>(`/api/admin/payments/${id}`, token, {
    method: "DELETE",
  });
}

// ─── Randevu talepleri ─────────────────────────────────────────

export function adminGetRequests(token: string, status?: RequestStatus) {
  return adminFetch<AppointmentRequest[]>(
    `/api/admin/requests${status ? `?status=${status}` : ""}`,
    token,
  );
}

export function adminConvertRequest(
  id: string,
  data: {
    firstName: string;
    lastName: string;
    phone: string;
    source?: string | null;
    note?: string;
    booking?: { date: string; time?: string };
  },
  token: string,
) {
  return adminFetch<{
    request: AppointmentRequest;
    patient: Patient;
    booking: Booking | null;
  }>(`/api/admin/requests/${id}/convert`, token, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function adminUpdateRequest(
  id: string,
  status: RequestStatus,
  token: string,
) {
  return adminFetch<AppointmentRequest>(`/api/admin/requests/${id}`, token, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
}

// ─── Bugün / rozetler ──────────────────────────────────────────

export function adminGetToday(token: string, date?: string) {
  return adminFetch<TodayResponse>(
    `/api/admin/today${date ? `?date=${date}` : ""}`,
    token,
  );
}

export function adminGetBadges(token: string) {
  return adminFetch<{ pendingRequests: number }>("/api/admin/badges", token);
}
