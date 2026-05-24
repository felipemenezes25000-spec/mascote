import { NextRequest, NextResponse } from "next/server";
import { locales, defaultLocale, type Locale } from "@/lib/locales";

function pickLocale(req: NextRequest): Locale {
  const accept = req.headers.get("accept-language") || "";
  const top = accept.split(",")[0]?.toLowerCase() ?? "";
  if (top.startsWith("pt")) return "pt";
  if (top.startsWith("es")) return "es";
  if (top.startsWith("en")) return "en";
  return defaultLocale;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasLocale = locales.some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`),
  );
  if (hasLocale) return NextResponse.next();
  if (pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = `/${pickLocale(req)}`;
    return NextResponse.redirect(url, 308);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|_vercel|api|favicon.svg|robots.txt|sitemap.xml|manifest.webmanifest|og|.*\\..*).*)"],
};
