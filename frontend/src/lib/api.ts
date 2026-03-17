import type { Post, PostListResponse, Faq } from "@/types";

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
