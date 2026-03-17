import { NextResponse } from "next/server";

const BASE = "https://trakyadyt.com";

const staticPages = [
  { url: BASE, priority: "1.0", changefreq: "weekly" },
  { url: `${BASE}/blog`, priority: "0.9", changefreq: "daily" },
  { url: `${BASE}/sss`, priority: "0.7", changefreq: "monthly" },
  { url: `${BASE}/hesaplamalar`, priority: "0.7", changefreq: "monthly" },
  { url: `${BASE}/araclar`, priority: "0.6", changefreq: "monthly" },
];

async function getPosts() {
  try {
    const BACKEND = process.env.BACKEND_URL ?? "http://localhost:5000";
    const res = await fetch(`${BACKEND}/api/posts?limit=100`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.posts ?? [];
  } catch {
    return [];
  }
}

export async function GET() {
  const posts = await getPosts();

  const postEntries = posts
    .map(
      (p: { slug: string; updatedAt?: string; publishedAt?: string }) => `
  <url>
    <loc>${BASE}/blog/${p.slug}</loc>
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
    <loc>${p.url}</loc>
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
    headers: { "Content-Type": "application/xml" },
  });
}
