import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";

function equalSecret(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function POST(req: NextRequest) {
  // This endpoint is for one-time Preview setup, never for the public production site.
  if (process.env.VERCEL_ENV !== "preview") {
    return NextResponse.json({ error: "Preview only" }, { status: 403 });
  }

  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!expected || !token) {
    return NextResponse.json({ error: "Missing server configuration" }, { status: 503 });
  }

  const supplied = req.headers.get("x-telegram-setup-secret") ?? "";
  if (!equalSecret(supplied, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fixed branch alias; do not trust user-provided webhook URLs.
  const webhook = "https://mee-naradha-git-chat-to-publish-foundation-rajaraveendar.vercel.app/api/chat-publish/telegram";
  const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: webhook,
      secret_token: expected,
      allowed_updates: ["message", "callback_query"],
      drop_pending_updates: true
    }),
    cache: "no-store"
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.ok !== true) {
    console.error("Telegram webhook registration failed", { status: response.status, code: result.error_code });
    return NextResponse.json({ error: "Telegram registration failed" }, { status: 502 });
  }
  return NextResponse.json({ ok: true, webhook, message: "Telegram webhook registered" });
}
