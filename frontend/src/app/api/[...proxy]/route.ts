import { NextRequest, NextResponse } from "next/server";

const BACKEND = () => process.env.BACKEND_URL ?? "http://localhost:5000";

async function handler(
  req: NextRequest,
  context: { params: Promise<{ proxy: string[] }> },
) {
  const { proxy } = await context.params;
  const path = proxy.join("/");

  // NextAuth handles /api/auth/* — don't proxy
  if (path.startsWith("auth")) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const search = req.nextUrl.search;
  const url = `${BACKEND()}/api/${path}${search}`;

  const headers = new Headers(req.headers);
  headers.delete("host");

  const body =
    req.method !== "GET" && req.method !== "HEAD" ? req.body : undefined;

  const response = await fetch(url, {
    method: req.method,
    headers,
    body,
    // @ts-expect-error — duplex required for streaming body
    duplex: "half",
  });

  return new NextResponse(response.body, {
    status: response.status,
    headers: response.headers,
  });
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
