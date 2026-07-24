export interface Post {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string;
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

export interface Appointment {
  _id: string;
  firstName: string;
  lastName: string;
  phone: string;
  amount: number;
  date: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentListResponse {
  appointments: Appointment[];
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
