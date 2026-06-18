/**
 * POST /api/waitlist
 *
 * Receives a lead from the landing page form and appends it to a gitignored
 * JSONL file under .data/.
 *
 * IMPORTANTE — serverless: o filesystem é efêmero em Vercel/Cloudflare/etc.
 * Pra produção nessas plataformas é preciso plugar um destino externo
 * (Resend audiences, Notion DB, Airtable, banco próprio) substituindo
 * `persistLead` abaixo. Em dev local ou self-hosted single-instance,
 * o arquivo .data/waitlist.jsonl funciona normalmente.
 */

import type { NextRequest } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FALLBACK_PATH = path.join(process.cwd(), ".data", "waitlist.jsonl");

interface Lead {
  email: string;
  name?: string;
  pick?: string;
  utm?: Record<string, string>;
  referrer?: string;
  ip?: string;
  user_agent?: string;
  created_at: string;
}

async function persistLead(lead: Lead): Promise<"file"> {
  await fs.mkdir(path.dirname(FALLBACK_PATH), { recursive: true });
  await fs.appendFile(FALLBACK_PATH, JSON.stringify(lead) + "\n", "utf8");
  return "file";
}

function sanitizeUtm(raw: unknown): Record<string, string> | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const out: Record<string, string> = {};
  let n = 0;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof k !== "string" || typeof v !== "string") continue;
    if (k.length > 60 || v.length > 200) continue;
    out[k] = v;
    if (++n >= 10) break;
  }
  return n > 0 ? out : undefined;
}

function clientIp(req: NextRequest): string | undefined {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || undefined;
  return req.headers.get("x-real-ip") || undefined;
}

export async function POST(req: NextRequest): Promise<Response> {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!payload || typeof payload !== "object") {
    return Response.json({ error: "invalid_payload" }, { status: 400 });
  }
  const p = payload as Record<string, unknown>;
  const emailRaw = typeof p.email === "string" ? p.email.trim().toLowerCase() : "";
  if (!emailRaw || emailRaw.length > 254 || !EMAIL_RE.test(emailRaw)) {
    return Response.json({ error: "invalid_email" }, { status: 400 });
  }
  const lead: Lead = {
    email: emailRaw,
    name: typeof p.name === "string" && p.name.trim() ? p.name.trim().slice(0, 120) : undefined,
    pick: typeof p.pick === "string" && p.pick.trim() ? p.pick.trim().slice(0, 60) : undefined,
    utm: sanitizeUtm(p.utm),
    referrer: typeof p.referrer === "string" ? p.referrer.slice(0, 500) : undefined,
    ip: clientIp(req),
    user_agent: req.headers.get("user-agent")?.slice(0, 300) || undefined,
    created_at: new Date().toISOString(),
  };
  try {
    const sink = await persistLead(lead);
    return Response.json({ ok: true, sink }, { status: 201 });
  } catch (err) {
    // Loga só a message (nunca o Error cru / stack) — em logs serverless
    // persistidos, stack de I/O pode vazar caminhos/detalhes do sistema.
    // eslint-disable-next-line no-console
    console.error("[waitlist] persist failed:", {
      reason: err instanceof Error ? err.message : "unknown",
    });
    return Response.json({ error: "persist_failed" }, { status: 500 });
  }
}
