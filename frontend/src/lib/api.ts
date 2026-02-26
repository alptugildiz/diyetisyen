import type { Post, PostListResponse, Faq } from "@/types";

// Server-side (SSR/SSG): Docker internal hostname
// Client-side (browser): empty string → relative URL → nginx proxies /api/* to backend
const API_URL = typeof window === "undefined" ? "http://backend:5000" : "";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, options);
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "API error" }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ─── Public ────────────────────────────────────────────────────

export function getPosts(page = 1, tag?: string): Promise<PostListResponse> {
  const params = new URLSearchParams({ page: String(page) });
  if (tag) params.set("tag", tag);
  return apiFetch<PostListResponse>(`/api/posts?${params}`);
}

export function getPost(slug: string): Promise<Post> {
  return apiFetch<Post>(`/api/posts/${slug}`);
}

export function getFaqs(): Promise<Faq[]> {
  return apiFetch<Faq[]>("/api/faqs");
}

// ─── Admin ─────────────────────────────────────────────────────

function adminFetch<T>(
  path: string,
  token: string,
  options?: RequestInit,
): Promise<T> {
  return apiFetch<T>(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options?.headers ?? {}),
    },
  });
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
