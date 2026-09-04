import { NextResponse } from "next/server";
import { SERVICES } from "@/content/hizmetler";

const BASE = "https://trakyadyt.com";

// Bu rota istek anında çalışmalı. Aksi hâlde Next build sırasında statik
// üretiyor; build makinesinde backend ayakta olmadığı için yazı listesi boş
// dönüyor ve site haritası kalıcı olarak yazısız yayınlanıyordu.
export const dynamic = "force-dynamic";

// `/araclar` bilerek yok: /hesaplamalar'a yönlendiriyor ve yönlendiren URL
// site haritasına konmaz.
const staticPages = [
  { url: BASE, priority: "1.0", changefreq: "weekly" },
  { url: `${BASE}/blog`, priority: "0.9", changefreq: "daily" },
  { url: `${BASE}/hizmetler`, priority: "0.9", changefreq: "monthly" },
  // Hizmet sayfaları yerel aramanın ana hedefi — blog yazılarından yüksek.
  ...SERVICES.map((s) => ({
    url: `${BASE}/hizmetler/${s.slug}`,
    priority: "0.85",
    changefreq: "monthly",
  })),
  { url: `${BASE}/sss`, priority: "0.7", changefreq: "monthly" },
  { url: `${BASE}/hesaplamalar`, priority: "0.7", changefreq: "monthly" },
  { url: `${BASE}/araclar/kalori-hesaplayici`, priority: "0.6", changefreq: "monthly" },
  { url: `${BASE}/araclar/vucut-analizi`, priority: "0.6", changefreq: "monthly" },
  { url: `${BASE}/araclar/antropometrik-olcumler`, priority: "0.6", changefreq: "monthly" },
];

interface SitemapPost {
  slug: string;
  updatedAt?: string;
  publishedAt?: string;
}

/**
 * Tüm yayınlanmış yazıları çeker.
 *
 * Backend `limit` parametresini 20'de sınırlıyor (`routes/posts.js`), bu yüzden
 * tek istekle hepsini almak mümkün değil — sayfalar arasında dolaşıyoruz.
 */
async function getPosts(): Promise<SitemapPost[]> {
  const BACKEND = process.env.BACKEND_URL ?? "http://localhost:5000";
  const all: SitemapPost[] = [];
  const MAX_PAGES = 50; // güvenlik freni — sonsuz döngüye girmesin

  try {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const res = await fetch(`${BACKEND}/api/posts?page=${page}&limit=20`, {
        next: { revalidate: 3600 },
      });
      if (!res.ok) break;

      const data = await res.json();
      const posts: SitemapPost[] = data.posts ?? [];
      all.push(...posts);

      if (posts.length === 0 || page >= (data.totalPages ?? 1)) break;
    }
  } catch {
    // Backend erişilemezse en azından statik sayfaları içeren bir harita dönsün.
    return all;
  }

  return all;
}

/** XML'e gömülecek metinde & < > kaçırılmalı; slug'da tire dışı karakter olabilir. */
function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const posts = await getPosts();

  const postEntries = posts
    .map(
      (p) => `
  <url>
    <loc>${xmlEscape(`${BASE}/blog/${p.slug}`)}</loc>
    <lastmod>${new Date(p.updatedAt ?? p.publishedAt ?? Date.now()).toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`,
    )
    .join("");

  const staticEntries = staticPages
    .map(
      (p) => `
  <url>
    <loc>${xmlEscape(p.url)}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`,
    )
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticEntries}
${postEntries}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
