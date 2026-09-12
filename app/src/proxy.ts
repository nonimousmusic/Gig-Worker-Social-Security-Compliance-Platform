import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Minimal in-memory fixed-window limiter for unauthenticated POST routes.
// Single-instance guard only: counters reset on redeploy and are not shared
// across instances. Use Redis/Upstash before relying on this in multi-instance prod.
const WINDOW_MS = 60_000;
const LIMITS: { path: RegExp; max: number }[] = [
  { path: /^\/api\/v1\/auth\/register$/, max: 10 },
  { path: /^\/api\/v1\/free-audit$/, max: 5 },
  { path: /^\/api\/v1\/ledger\/upload$/, max: 10 },
];
const hits = new Map<string, number[]>();

function isRateLimited(ip: string, pathname: string): boolean {
  const rule = LIMITS.find((r) => r.path.test(pathname));
  if (!rule) return false;
  const now = Date.now();
  const key = `${ip}:${rule.path.source}`;
  const recent = (hits.get(key) || []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) {
    const cutoff = now - WINDOW_MS;
    for (const [k, v] of hits) {
      const kept = v.filter((t) => t > cutoff);
      if (kept.length === 0) hits.delete(k);
      else hits.set(k, kept);
    }
  }
  return recent.length > rule.max;
}

export async function proxy(request: NextRequest) {
  if (request.method === "POST") {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    if (isRateLimited(ip, request.nextUrl.pathname)) {
      return NextResponse.json(
        { success: false, error: { code: "RATE_LIMITED", message: "Too many requests — try again later." } },
        { status: 429 }
      );
    }
  }
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image, favicon
     * - public assets
     * - API register endpoint (must stay reachable pre-auth)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api/auth/register).*)",
  ],
};