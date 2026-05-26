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
  // Defesa em profundidade contra CVE-2025-29927 (middleware bypass via header
  // sintético). Already patched em next>=14.2.25, mas qualquer request externo
  // que carregue esse header não tem motivo legítimo — bloqueamos.
  if (req.headers.get("x-middleware-subrequest")) {
    return new NextResponse(null, { status: 400 });
  }
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
