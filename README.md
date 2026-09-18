# Edge Guard

**A Cloudflare zone managed entirely by Terraform.**
Live: **https://edge-guard.diogodebastos.com/**

A small, honest proof of concept: WAF custom rules, a rate limiting rule, a cache rule,
zone TLS settings, Bot Fight Mode, Turnstile, and a Workers AI assistant — every one of
them declared in HCL and applied with `terraform apply` against a real zone on the
**Free plan**.

The page is not a mock-up. The posture table it renders comes from a `POSTURE` binding
that Terraform fills with `jsonencode()` of the *same* `locals` the ruleset resources
consume, so the page cannot drift from what was actually applied. The buttons hit the
real zone from your browser and show the status code and `cf-ray` that Cloudflare returns.

---

## Why this repo exists

I had never used Terraform before building this. The goal was to learn it against
something real rather than a tutorial: a zone I own, already serving a live site I
could break. That constraint drove most of the interesting decisions below.

---

## The zone: two apps, two owners

`diogodebastos.com` is a single Free-plan zone that hosts **two** applications with
**different deployment tools**. Getting that split right was the first design problem.

```
                       diogodebastos.com  (one Cloudflare zone, Free plan)
                                     │
        ┌────────────────────────────┴────────────────────────────┐
        │                                                          │
  apex + www                                              edge-guard.…
  diogodebastos.com                                       edge-guard.diogodebastos.com
  www.diogodebastos.com                                             │
        │                                                          │
  Worker: edge-cavai                                        Worker: edge-guard
  custom domains + script                                   custom domain + script
        │                                                          │
  ▸ owned by WRANGLER                                       ▸ owned by TERRAFORM
    (wrangler.toml `routes`)                                  (this repo, infra/)
        │                                                          │
        └────────────────────────────┬─────────────────────────────┘
                                     │
                    ZONE-LEVEL CONFIG — owned by TERRAFORM
                    and applying to BOTH apps:
                      • WAF custom rules      (http_request_firewall_custom)
                      • Rate limiting         (http_ratelimit)
                      • Cache rules           (http_request_cache_settings)
                      • Zone settings         (TLS, HSTS, Always Use HTTPS)
                      • Bot Fight Mode        (+ JS Detections)
```

**The rule I held myself to:** Terraform never creates, imports, changes or deletes DNS
records or custom domains for the apex or `www`. Those belong to wrangler. Terraform
declares exactly one hostname, `edge-guard.diogodebastos.com`, via
`cloudflare_workers_custom_domain`, which creates its own proxied DNS record.

Before the first apply I checked the plan for this explicitly:

```
$ terraform show -json tfplan | grep -oE '"(www\.diogodebastos\.com|cloudflare_dns_record)"'
(no output)
```

### ⚠️ Terraform owns each ruleset phase entrypoint

`cloudflare_ruleset` manages the **entrypoint ruleset for a whole phase** on this zone,
not just the individual rules in it. For the three phases in this repo
(`http_request_firewall_custom`, `http_ratelimit`, `http_request_cache_settings`),
**a rule added by hand in the dashboard will be removed on the next `terraform apply`.**
If you want a rule to survive, it has to be added to `security.tf` or `cache.tf`.

---

## What is managed, and why

`terraform state list` (12 objects):

```
data.cloudflare_zone.this
cloudflare_bot_management.this
cloudflare_ruleset.cache
cloudflare_ruleset.ratelimit
cloudflare_ruleset.waf_custom
cloudflare_turnstile_widget.edge_guard
cloudflare_workers_custom_domain.edge_guard
cloudflare_workers_kv_namespace.events
cloudflare_workers_script.edge_guard
cloudflare_zone_setting.always_use_https
cloudflare_zone_setting.hsts
cloudflare_zone_setting.min_tls_version
```

### WAF custom rules — `http_request_firewall_custom`

| # | Scope | Action | What it does |
|---|-------|--------|--------------|
| 1 | **zone-wide** | `block` | Blocks `/wp-admin*`, `/wp-login.php` and `/.env` probes on **any** host |
| 2 | host-scoped | `block` | Blocks requests carrying `x-edge-guard-test: block` |
| 3 | host-scoped | `managed_challenge` | Challenges known scanner user agents (sqlmap, nikto, masscan, nmap) |
| 4 | host-scoped | `managed_challenge` | Challenges Tor exits (`ip.src.country eq "T1"`) — never a blanket block |

Rule 1 is **deliberately zone-wide**: the main site benefits from it too, and there is no
reason to let credential probes through on a hostname just because it is not the demo.
Rules 2–4 are scoped with `http.host eq "edge-guard.diogodebastos.com"` so the main site
is untouched.

### Rate limiting — `http_ratelimit`

One rule, scoped to the Edge Guard host and `/api/ping`: **5 requests per 10 s per IP**,
action `block`, mitigation timeout 10 s, counting on `["ip.src", "cf.colo.id"]`.

### Cache — `http_request_cache_settings`

Host-scoped to `/static/*`, `set_cache_settings` with an explicit **300 s edge TTL**.
See the honest caveat in *What did not work as expected* below.

### Zone settings (zone-wide — they affect the main site too)

| Setting | Value | Note |
|---|---|---|
| `always_use_https` | `on` | was `off` |
| `min_tls_version` | `1.2` | was `1.0` |
| `security_header` (HSTS) | `max-age=31536000`, no `includeSubDomains`, no preload | was disabled |

I deliberately **did not touch the SSL mode** (left at `full`). It was the one setting
where a wrong value could take the live site down, and the PoC did not need it.

### Bot Fight Mode (zone-wide, applied as a separate second step)

`cloudflare_bot_management` with `fight_mode = true`. It **cannot be scoped to one
hostname on the Free plan**, so it covers the main site as well. That is why it lives
behind a variable and was applied as a deliberate second `terraform apply`.

### Turnstile + Workers AI

A managed-mode `cloudflare_turnstile_widget` for the Edge Guard hostname. Its **secret is
wired straight into the Worker** as a `secret_text` binding
(`cloudflare_turnstile_widget.edge_guard.secret`) — the secret never touches the repo,
and there is no manual copy-paste step between creating the widget and using it.

Both AI endpoints verify the token server-side with `siteverify` **before** the model is
called. Verified:

```
POST /api/ai/explain  {"token":"not-a-real-token"} → 403 invalid-input-response
POST /api/ai/explain  {}                           → 403 missing-input-response
```

Model: `@cf/meta/llama-3.3-70b-instruct-fp8-fast`.

### The Worker and its bindings

`cloudflare_workers_script.edge_guard` uploads the bundle from `worker/dist` and declares
every binding:

| Binding | Type | Purpose |
|---|---|---|
| `AI` | `ai` | Workers AI |
| `EVENTS` | `kv_namespace` | recent demo results (24 h TTL) |
| `POSTURE` | `plain_text` | `jsonencode()` of the rule locals — what the page renders |
| `TURNSTILE_SECRET` | `secret_text` | from the Turnstile resource |
| `AI_MODEL` | `plain_text` | model id |

Wrangler is used **only to bundle** (`wrangler deploy --dry-run --outdir dist`). It never
deploys this Worker; Terraform does.

---

## Free-plan limits I actually hit

These shaped the config, and each one is a real constraint I had to design around:

| Limit | Value on Free | Consequence here |
|---|---|---|
| WAF custom rules | **5 per zone** | I used 4, leaving headroom |
| WAF `log` action | **not available** | The "observe only" country rule had to use `managed_challenge` instead |
| WAF regex (`matches`) | **not available** | All expressions use `starts_with` / `ends_with` / `contains` / `eq` |
| Rate limiting rules | **1 per zone** | Exactly one rule, on `/api/ping` |
| Rate limiting period | **10 s only** | `period = 10` |
| Rate limiting mitigation timeout | **10 s only** | `mitigation_timeout = 10` |
| Bot Fight Mode scoping | **zone-wide only** | Cannot exempt the main site |
| HTTP DDoS managed ruleset overrides | **Enterprise + Advanced DDoS only** | **Not configured — see below** |

### DDoS: deliberately not configured

Cloudflare's L3–L7 DDoS managed rulesets are **always on and unmetered on every plan**,
including Free. Configuring *overrides* for them (the `ddos_l7` phase) requires Enterprise
with the Advanced DDoS Protection add-on. Rather than fake a resource that would not
apply, **no DDoS resource is declared in this repo.** The protection is real; the
configurability is not available here.

---

## Verified behaviour

All checks below were run against the live zone. Status codes are real output.

### Edge Guard

| Check | Result |
|---|---|
| `GET /` | **200** |
| `GET /wp-admin` | **403** |
| `GET /wp-login.php` | **403** |
| `GET /.env` | **403** |
| `GET /api/ping` with `x-edge-guard-test: block` | **403** |
| `GET /api/ping` without the header | **200** |
| `GET /api/ping` with `User-Agent: sqlmap/1.7` | **403** |
| 30 sequential requests to `/api/ping` | **5 × 200, then 25 × 429** |
| `/static/logo.svg` twice | `cf-cache-status` **MISS**, then **HIT** (`age` increments) |
| `/` and `/api/ping` cache status | **BYPASS** (both send `no-store`, as intended) |
| Response CSP | `frame-ancestors 'self' https://diogodebastos.com` present, **no** `X-Frame-Options` |

### Main site, after every apply

| Check | Result |
|---|---|
| `https://diogodebastos.com/` | **200** |
| `https://diogodebastos.com/cv` | **200** |
| `https://diogodebastos.com/vibe-coding` | **200** |
| `https://diogodebastos.com/wp-admin` | **403** ← the zone-wide rule protecting the main site |
| CV chat, in a real browser, after Bot Fight Mode | **still answers correctly** |

### Observed Bot Fight Mode behaviour

This is what actually happened, which is **not** quite what I expected:

- **Real browsers: unaffected.** Both `https://edge-guard.diogodebastos.com/` and
  `https://diogodebastos.com/` load normally in Chromium via Playwright, and the CV chat
  on the main site still answers.
- **Automated clients: not challenged either.** With `fight_mode = true` confirmed by the
  API, plain `curl` still received **HTTP 200 with no `cf-mitigated` header** on both
  hostnames. The same held for `python-requests`, `Go-http-client`, `Scrapy` and `Wget`
  user agents.
- **JS Detections is visibly active.** After the apply, the main site's HTML contains the
  injected `/cdn-cgi/challenge-platform/scripts/jsd/main.js` snippet, which it did not
  before — so the setting is genuinely live.

I did **not** manage to produce a `cf-mitigated: challenge` response from either
hostname. I am not going to claim a cause I could not verify: Cloudflare's Bot Fight Mode
docs do not document an exclusion for Worker-served requests, and challenged requests are
reported in Security Analytics under the *Bot Fight Mode* service rather than via a header
I can see from `curl`. Both hostnames here are served by Workers, which is the obvious
common factor, but I am flagging that as an untested hypothesis rather than a finding.

**No rollback was needed** — nothing broke for real browsers.

### Bot Fight Mode requires JavaScript Detections

The first attempt to enable it failed, and the error was worth keeping:

```
PUT .../bot_management: 400 Bad Request
"cannot enable Fight_Mode while EnableJS is disabled"
```

So the resource sets both `enable_js` and `fight_mode`. JS Detections is *also* zone-wide:
it injects a small non-blocking detection script into HTML responses across the zone,
main site included.

---

## What did not work as expected

**Cache rules do not cache a Worker's own response.** The `/static/*` cache rule applied
cleanly, but the first `MISS → HIT` test returned **no `cf-cache-status` header at all**.
The Cloudflare docs are explicit:

> "No zone configuration for caching applies to Workers Caching. Cache Rules, Cache
> Response Rules, Page Rules, cache level settings… have no effect on a Worker's cache."

A Worker on a custom domain *is* the origin, so its generated bytes never go through the
zone cache the rule governs. The fix was to enable **Workers Cache** — also from
Terraform, via `cache_options = { enabled = true }` on `cloudflare_workers_script` — after
which `/static/logo.svg` returns `MISS` then `HIT` with an incrementing `age`, honouring
the `Cache-Control: public, max-age=300` the Worker sets.

Both are kept in the repo, and the page says which one produced the HIT. The cache rule is
real and applied; it is simply the wrong layer for Worker-generated bytes. **This is the
single most useful thing I learned building this.**

**Parallel bursts do not trigger rate limiting.** The first in-browser burst fired all 30
requests with `Promise.all` and got **30 × 200**, while sequential `curl` got
5 × 200 + 25 × 429. Fired in parallel, all 30 reach the edge before the counter catches
up. The demo now sends them sequentially, and reports 5 × 200 + 25 × 429 in the browser
too. Rate limit counters are eventually consistent — worth knowing before promising a
customer an exact threshold.

**A perpetual diff on the Worker script.** `terraform plan` always reports
`cloudflare_workers_script.edge_guard will be updated in-place`, even immediately after a
successful apply, because the provider marks computed attributes (`etag`,
`compatibility_flags`, `startup_time_ms`, …) as unknown on every plan. It is provider
noise, not real drift: applying it re-uploads identical content. Worth knowing before
wiring a "plan is clean" gate into CI.

---

## Reproduce it

**Prerequisites:** Terraform ≥ 1.5, Node 22, and a Cloudflare API token.

Token scopes used here:

- **Account:** Workers Scripts Edit, Workers KV Storage Edit, Turnstile Sites Edit, Account Settings Read
- **Zone** (the one zone only): Zone Read, DNS Edit, Workers Routes Edit, Zone Settings Edit, Zone WAF Edit, Cache Rules Edit, Bot Management Edit

```bash
export CLOUDFLARE_API_TOKEN=...          # never committed, never echoed
export CLOUDFLARE_ACCOUNT_ID=...
export TF_VAR_zone_name=example.com
export TF_VAR_hostname=edge-guard.example.com

# 1. bundle the Worker (wrangler bundles only; it never deploys)
cd worker && npm ci && npm run build && cd ..

# 2. apply everything except Bot Fight Mode
cd infra
terraform init
terraform fmt -check
terraform validate
terraform plan -out=tfplan      # review it: it must not touch your apex or www
terraform apply tfplan

# 3. Bot Fight Mode, as a deliberate second step (it is ZONE-WIDE)
#    set enable_bot_fight_mode default = true in variables.tf, then:
terraform plan -out=tfplan
terraform apply tfplan
```

Tear down:

```bash
cd infra && terraform destroy
```

⚠️ `cloudflare_bot_management` and the `cloudflare_zone_setting` resources **cannot be
destroyed through the API** — Terraform warns about this on create. `destroy` removes them
from state but leaves the values live on the zone; reset those in the dashboard if you
want the zone back to its original state.

State is **local and gitignored** (`*.tfstate*`). For anything shared or production, this
belongs in remote state with locking — local state is a deliberate scope cut for a
single-operator PoC, not a recommendation.

### CI

`.github/workflows/ci.yml` runs `terraform fmt -check`, `terraform init -backend=false`,
`terraform validate`, `tsc --noEmit`, an inline-script parse check, and a dry-run bundle.
**It never runs `terraform apply`** and holds no credentials.

The terraform job bundles the Worker first. `worker/dist` is gitignored, but `worker.tf`
reads it with `filesha256()`, and `terraform validate` evaluates function calls — so
without the bundle, validate fails with
`Call to function "filesha256" failed: open ../worker/dist/index.js: no such file`.
The first CI run caught exactly that.

The inline-script check exists because of a real bug: the client-side script lives inside a
TypeScript template literal, and a stray apostrophe inside a single-quoted JS string
shipped as a `SyntaxError` that silently killed **every** button on the page while the HTML
still rendered perfectly. `worker/scripts/check-inline-js.mjs` now parses that script the
way a browser would and fails the build.

---

## What I learned

*(Draft — written from what actually happened during the build. Diogo to replace with
his own words before this goes in front of an interviewer.)*

1. **Terraform's value here is the plan, not the apply.** Against a zone already serving a
   live site, `terraform plan -out` plus reading the JSON for anything touching the apex
   was what made this safe to do at all. The plan is the review artifact.
2. **The Rulesets engine is one model with many phases.** WAF custom rules, rate limiting
   and cache rules are all `cloudflare_ruleset` with a different `phase` — once that
   clicked, three "products" became one resource with one mental model.
3. **Owning the phase entrypoint is a real operational commitment.** Terraform does not
   own *rules*, it owns the *phase*. Handing that to a customer means telling them their
   dashboard edits will vanish on the next apply.
4. **Free-plan limits are design inputs, not footnotes.** No `log` action and no regex
   changed what rules I could write, not just how many.
5. **Declare the layer you actually mean.** The cache-rule-versus-Workers-Cache problem
   was not a Terraform issue at all; it was me applying a correct config at the wrong
   layer. Reading the docs beat re-reading my HCL.
6. **`jsonencode()` of a `locals` block is a genuinely nice pattern.** One list feeds both
   the ruleset resources and the Worker binding the page renders, so the documentation of
   the config cannot drift from the config.
7. **Verify against the real thing.** Every interesting finding here — the parallel-burst
   non-result, the missing `cf-cache-status`, the `EnableJS` error, Bot Fight Mode not
   challenging `curl` — came from running it, not from reasoning about it.

---

## Repo layout

```
infra/
  providers.tf    provider pinned to ~> 5 (5.25.0 in the lock file)
  variables.tf    zone_name, hostname, account_id, enable_bot_fight_mode
  zone.tf         zone data source + the three zone settings
  security.tf     WAF rules + rate limiting + bot management (the rule locals live here)
  cache.tf        cache rule
  turnstile.tf    Turnstile widget
  worker.tf       KV, the POSTURE locals, the Worker script, the custom domain
  outputs.tf      url, zone_id, turnstile_sitekey, waf_rule_count
worker/
  src/index.ts    routing, Turnstile siteverify, Workers AI handlers
  src/page.ts     the rendered page
  src/types.ts    Env and posture types
  scripts/check-inline-js.mjs
.github/workflows/ci.yml
```

---

Built AI-native with [Claude Code](https://claude.com/claude-code) ·
[diogodebastos.com](https://diogodebastos.com)
