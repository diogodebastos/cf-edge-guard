import type { Env, Posture, PostureRule } from "./types";
import { renderPage } from "./page";

// The page is embedded as an iframe on https://diogodebastos.com/vibe-coding,
// so frame-ancestors must allow that origin and X-Frame-Options must NOT be set.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com",
  "frame-src https://challenges.cloudflare.com",
  "connect-src 'self'",
  "img-src 'self' data:",
  "frame-ancestors 'self' https://diogodebastos.com",
].join("; ");

function withSecurityHeaders(res: Response): Response {
  const h = new Headers(res.headers);
  h.set("content-security-policy", CSP);
  h.set("x-content-type-options", "nosniff");
  h.set("referrer-policy", "strict-origin-when-cross-origin");
  return new Response(res.body, { status: res.status, headers: h });
}

function json(data: unknown, status = 200, extra: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...extra },
  });
}

function readPosture(env: Env): Posture {
  return JSON.parse(env.POSTURE) as Posture;
}

const LOGO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" role="img" aria-label="Edge Guard">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#A6FFA3"/><stop offset="1" stop-color="#9179eb"/>
    </linearGradient>
  </defs>
  <path d="M32 3 58 12v20c0 14.4-10.4 24.9-26 29C16.4 56.9 6 46.4 6 32V12L32 3Z" fill="url(#g)" opacity=".18"/>
  <path d="M32 3 58 12v20c0 14.4-10.4 24.9-26 29C16.4 56.9 6 46.4 6 32V12L32 3Z" fill="none" stroke="url(#g)" stroke-width="3" stroke-linejoin="round"/>
  <path d="M21 32.5 29 40l15-16" fill="none" stroke="#A6FFA3" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

// ── Turnstile ────────────────────────────────────────────────────────────────
async function verifyTurnstile(
  token: string,
  ip: string | null,
  env: Env,
): Promise<{ ok: boolean; codes: string[] }> {
  if (!token) return { ok: false, codes: ["missing-input-response"] };
  const form = new FormData();
  form.append("secret", env.TURNSTILE_SECRET);
  form.append("response", token);
  if (ip) form.append("remoteip", ip);

  const res = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    { method: "POST", body: form },
  );
  const body = (await res.json()) as {
    success: boolean;
    "error-codes"?: string[];
  };
  return { ok: body.success === true, codes: body["error-codes"] ?? [] };
}

// ── Workers AI ───────────────────────────────────────────────────────────────
const SYSTEM_EXPLAIN =
  "You are a Cloudflare solutions engineer. Explain the given Cloudflare Ruleset rule to a technical " +
  "audience in at most 120 words: what the expression matches, what the action does, what traffic is " +
  "affected, and one practical caveat. Plain prose, no markdown headings, no bullet lists.";

const SYSTEM_DRAFT =
  "You are a Cloudflare solutions engineer. From the user's plain-English request, produce exactly two " +
  "sections and nothing else.\n" +
  "First, a line 'EXPRESSION:' followed by a single valid Cloudflare Rules language expression.\n" +
  "Second, a line 'TERRAFORM:' followed by one HCL object for the rules list of a cloudflare_ruleset " +
  "resource, with the keys action, expression, description and enabled.\n" +
  "Constraints: the target zone is on the Free plan, so do not use the 'log' action and do not use regex " +
  "operators such as 'matches'. Prefer starts_with, ends_with, contains, eq and in. Do not add commentary.";

async function runModel(
  env: Env,
  system: string,
  user: string,
): Promise<string> {
  const out = (await env.AI.run(env.AI_MODEL as keyof AiModels, {
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    max_tokens: 700,
    temperature: 0.2,
  } as never)) as { response?: string };
  return (out.response ?? "").trim();
}

async function recordEvent(env: Env, kind: string, detail: string) {
  const key = `event:${Date.now()}:${crypto.randomUUID().slice(0, 8)}`;
  // Recent demo results only: 24h TTL keeps the namespace self-cleaning.
  await env.EVENTS.put(
    key,
    JSON.stringify({ kind, detail, at: new Date().toISOString() }),
    { expirationTtl: 86400 },
  );
}

function ruleText(r: PostureRule): string {
  return [
    `phase: ${r.phase}`,
    `scope: ${r.scope}`,
    `action: ${r.action}`,
    `expression: ${r.expression}`,
    `description: ${r.description}`,
  ].join("\n");
}

async function handleAi(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  mode: "explain" | "draft",
): Promise<Response> {
  if (request.method !== "POST") return json({ error: "POST only" }, 405);

  let body: { token?: string; index?: string; prompt?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ error: "invalid JSON body" }, 400);
  }

  const verdict = await verifyTurnstile(
    body.token ?? "",
    request.headers.get("cf-connecting-ip"),
    env,
  );
  if (!verdict.ok) {
    return json(
      { error: `Turnstile verification failed (${verdict.codes.join(", ") || "no reason given"})` },
      403,
    );
  }

  const posture = readPosture(env);
  let user: string;

  if (mode === "explain") {
    const idx = Number(body.index ?? 0);
    const rule = posture.rules[idx];
    if (!rule) return json({ error: "unknown rule" }, 400);
    user = `Explain this rule, which is currently applied to the zone ${posture.zone}:\n\n${ruleText(rule)}`;
  } else {
    const ask = (body.prompt ?? "").slice(0, 500).trim();
    if (!ask) return json({ error: "empty prompt" }, 400);
    user =
      `Zone: ${posture.zone}. Edge Guard is served on ${posture.hostname}.\n` +
      `Request: ${ask}`;
  }

  let answer: string;
  try {
    answer = await runModel(
      env,
      mode === "explain" ? SYSTEM_EXPLAIN : SYSTEM_DRAFT,
      user,
    );
  } catch (e) {
    return json({ error: `Workers AI call failed: ${(e as Error).message}` }, 502);
  }
  if (!answer) return json({ error: "the model returned an empty response" }, 502);

  if (mode === "draft") {
    answer += "\n\n⚠ Draft only — review this expression and plan it with Terraform before applying it to a live zone.";
  }

  ctx.waitUntil(recordEvent(env, mode, answer.slice(0, 200)));
  return json({ answer, model: env.AI_MODEL });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/" || path === "/index.html") {
      return withSecurityHeaders(
        new Response(renderPage(readPosture(env)), {
          headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
        }),
      );
    }

    if (path === "/static/logo.svg") {
      // Cacheable at the edge; the Terraform cache rule overrides the edge TTL.
      return withSecurityHeaders(
        new Response(LOGO, {
          headers: {
            "content-type": "image/svg+xml; charset=utf-8",
            "cache-control": "public, max-age=300",
          },
        }),
      );
    }

    if (path === "/api/ping") {
      return withSecurityHeaders(
        json({ ok: true, ts: Date.now() }, 200, { "cache-control": "no-store" }),
      );
    }

    if (path === "/api/posture") {
      return withSecurityHeaders(
        json(readPosture(env), 200, { "cache-control": "no-store" }),
      );
    }

    if (path === "/api/events") {
      const list = await env.EVENTS.list({ prefix: "event:", limit: 20 });
      const items = await Promise.all(
        list.keys.map((k) => env.EVENTS.get(k.name, "json")),
      );
      return withSecurityHeaders(json({ events: items.filter(Boolean) }));
    }

    if (path === "/api/ai/explain") {
      return withSecurityHeaders(await handleAi(request, env, ctx, "explain"));
    }
    if (path === "/api/ai/draft") {
      return withSecurityHeaders(await handleAi(request, env, ctx, "draft"));
    }

    return withSecurityHeaders(json({ error: "not found" }, 404));
  },
} satisfies ExportedHandler<Env>;
