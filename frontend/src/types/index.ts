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
}
