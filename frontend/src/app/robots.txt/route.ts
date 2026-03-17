import { NextResponse } from "next/server";

export function GET() {
  return new NextResponse(
    `User-agent: *
Allow: /
Disallow: /admin/

Sitemap: https://trakyadyt.com/sitemap.xml
`,
    { headers: { "Content-Type": "text/plain" } },
  );
}
