export interface Post {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string;
  coverImageAlt?: string;
  metaTitle?: string;
  metaDescription?: string;
  tags: string[];
  status: "draft" | "published";
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface PostListResponse {
  posts: Omit<Post, "content">[];
  total: number;
  page: number;
  totalPages: number;
}

export interface Faq {
  _id: string;
  question: string;
  answer: string;
  order: number;
  isActive: boolean;
}

export type ExpenseCategory = "vergi" | "muhasebe" | "bagkur" | "diger";

export interface Expense {
  _id: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseListResponse {
  expenses: Expense[];
  total: number;
  count: number;
}

export type PatientSource =
  | "instagram"
  | "google"
  | "dis_hekimi"
  | "danisan_tavsiyesi"
  | "web_sitesi"
  | "klinik_ici"
  | "diger";

export type PatientSourceKey = PatientSource | "belirtilmemis";

export type PatientProcessStatus = "aktif" | "tamamladi" | "birakti";

export interface Patient {
  _id: string;
  firstName: string;
  lastName: string;
  phone: string;
  source: PatientSource | null;
  processStatus: PatientProcessStatus;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export type BookingStatus = "planlandi" | "geldi" | "gelmedi" | "iptal";
export type BookingVisitType = "ilk_gorusme" | "kontrol";
export type BookingCancelReason =
  | "tarih_uygun_degil"
  | "ucret"
  | "unuttu"
  | "saglik_problemi"
  | "iletisim_kurulamadi"
  | "baska_hizmet"
  | "belirtilmedi";

export interface Booking {
  _id: string;
  patient: Pick<Patient, "_id" | "firstName" | "lastName" | "phone">;
  date: string;
  time: string;
  status: BookingStatus;
  visitType: BookingVisitType | null;
  cancelReason: BookingCancelReason | null;
  // Tahakkuk: bu seansın ücreti. Tahsilat ayrı bir Payment kaydıdır.
  fee: number;
  patientPackage: string | null;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface PatientDetail {
  patient: Patient;
  bookings: Booking[];
}

export interface StatsResponse {
  totalRevenue: number;
  totalExpenses: number;
  netRevenue: number;
  sessionRevenue: number;
  packageRevenue: number;
  outstandingReceivables: number;
  topDebtors: { name: string; phone: string; debt: number }[];
  paymentBreakdown: {
    method: PaymentMethod;
    total: number;
  }[];
  totalAppointments: number;
  uniquePatients: number;
  avgPerAppointment: number;
  avgPerPatient: number;
  newPatients: number;
  returningPatients: number;
  revenueChangePct: number | null;
  appointmentsChangePct: number | null;
  monthly: { month: string; revenue: number; count: number }[];
  weekday: { day: string; count: number; revenue: number }[];
  topPatients: {
    name: string;
    phone: string;
    revenue: number;
    visits: number;
  }[];
  monthlySummary: {
    totalBookings: number;
    totalBookingsChangePct: number | null;
    completed: number;
    completedChangePct: number | null;
    cancelled: number;
    cancelledChangePct: number | null;
    noShow: number;
    noShowChangePct: number | null;
    newPatients: number;
    newPatientsChangePct: number | null;
    followUps: number;
    followUpsChangePct: number | null;
    revenue: number;
    revenueChangePct: number | null;
  };
  retention: {
    firstToSecondRate: number | null;
    avgFollowUpCount: number;
    avgFollowUpSpanDays: number;
    processStatusBreakdown: {
      status: PatientProcessStatus;
      count: number;
    }[];
  };
  sourceBreakdown: { source: PatientSourceKey; count: number }[];
  cancelReasonBreakdown: {
    reason: BookingCancelReason;
    count: number;
  }[];
}

// ─── Para: paket, tahsilat ─────────────────────────────────────

export type PaymentMethod = "nakit" | "kart" | "havale";
export type PaymentSource = "booking" | "package";
export type RequestStatus = "yeni" | "donusturuldu" | "yoksayildi";
export type PatientPackageStatus = "aktif" | "tamamlandi" | "iptal";

export interface Package {
  _id: string;
  name: string;
  sessionCount: number;
  price: number;
  isActive: boolean;
  order: number;
}

export interface PatientPackage {
  _id: string;
  patient: Pick<Patient, "_id" | "firstName" | "lastName" | "phone">;
  package: string | null;
  name: string;
  sessionCount: number;
  price: number;
  soldAt: string;
  status: PatientPackageStatus;
  note: string;
  // Sunucuda türetilir, saklanmaz
  usedSessions: number;
  remainingSessions: number;
  paidAmount: number;
  remainingDebt: number;
}

export interface Payment {
  _id: string;
  patient: Pick<Patient, "_id" | "firstName" | "lastName" | "phone">;
  source: PaymentSource;
  booking: Pick<Booking, "_id" | "date" | "time"> | null;
  patientPackage: Pick<PatientPackage, "_id" | "name"> | null;
  amount: number;
  method: PaymentMethod;
  date: string;
  documentNumber: string;
  note: string;
}

export interface PaymentListResponse {
  payments: Payment[];
  total: number;
  count: number;
}

export interface ReceivableRow {
  patient: Pick<Patient, "_id" | "firstName" | "lastName" | "phone">;
  debt: number;
}

export interface ReceivablesResponse {
  total: number;
  rows: ReceivableRow[];
}

export interface PatientListResponse {
  patients: Patient[];
  total: number;
  page: number;
  totalPages: number;
}

export interface AppointmentRequest {
  _id: string;
  name: string;
  email: string;
  phone: string;
  status: RequestStatus;
  patient: Pick<Patient, "_id" | "firstName" | "lastName"> | null;
  createdAt: string;
}

export interface TodayResponse {
  date: string;
  bookings: Booking[];
  unprocessedCount: number;
  collectedToday: number;
  outstandingReceivables: number;
  endingPackages: {
    patient: Pick<Patient, "_id" | "firstName" | "lastName">;
    name: string;
    remainingSessions: number;
  }[];
  pendingRequests: number;
}
