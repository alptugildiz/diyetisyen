import { NextRequest, NextResponse } from "next/server";

const BACKEND = () => process.env.BACKEND_URL ?? "http://localhost:5000";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const url = `${BACKEND()}/uploads/${path.join("/")}`;

  const response = await fetch(url);

  if (!response.ok) {
    return new NextResponse(null, { status: response.status });
  }

  return new NextResponse(response.body, {
    status: response.status,
    headers: response.headers,
  });
}
