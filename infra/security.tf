# ── WAF custom rules ─────────────────────────────────────────────────────────
# Free plan limits that shape this file:
#   * 5 custom rules per zone (we use 4)
#   * the "log" action is NOT available, so the observation-only rule uses
#     managed_challenge instead
#   * no regex (`matches`), so expressions use starts_with / ends_with / contains
#
# Defined as a local so the exact same list feeds both the ruleset resource and
# the Worker's POSTURE binding: the page can only ever show what Terraform applied.

locals {
  waf_rules = [
    {
      description = "Zone-wide: block common CMS and credential probes"
      scope       = "zone-wide"
      action      = "block"
      expression  = "(starts_with(http.request.uri.path, \"/wp-admin\")) or (http.request.uri.path eq \"/wp-login.php\") or (ends_with(http.request.uri.path, \"/.env\")) or (starts_with(http.request.uri.path, \"/.env\"))"
    },
    {
      description = "Edge Guard: block the demo test header"
      scope       = "host-scoped"
      action      = "block"
      expression  = "(${local.host_scope} and any(http.request.headers[\"x-edge-guard-test\"][*] eq \"block\"))"
    },
    {
      description = "Edge Guard: managed challenge for known scanner user agents"
      scope       = "host-scoped"
      action      = "managed_challenge"
      expression  = "(${local.host_scope} and (lower(http.user_agent) contains \"sqlmap\" or lower(http.user_agent) contains \"nikto\" or lower(http.user_agent) contains \"masscan\" or lower(http.user_agent) contains \"nmap\"))"
    },
    {
      description = "Edge Guard: managed challenge for Tor exits (country T1), never a block"
      scope       = "host-scoped"
      action      = "managed_challenge"
      expression  = "(${local.host_scope} and ip.src.country eq \"T1\")"
    },
  ]

  ratelimit = {
    description         = "Edge Guard: rate limit /api/ping per IP"
    scope               = "host-scoped"
    action              = "block"
    expression          = "(${local.host_scope} and starts_with(http.request.uri.path, \"/api/ping\"))"
    requests_per_period = 5
    period              = 10
    mitigation_timeout  = 10
    characteristics     = ["ip.src", "cf.colo.id"]
  }
}

resource "cloudflare_ruleset" "waf_custom" {
  zone_id     = local.zone_id
  kind        = "zone"
  name        = "Edge Guard custom rules"
  phase       = "http_request_firewall_custom"
  description = "Managed by Terraform (cf-edge-guard)."

  rules = [
    for r in local.waf_rules : {
      action      = r.action
      expression  = r.expression
      description = r.description
      enabled     = true
    }
  ]
}

# ── Rate limiting ────────────────────────────────────────────────────────────
# Free plan allows exactly one rate limiting rule, with a 10 s counting period
# and a 10 s mitigation timeout. Both are the only values Free accepts.

resource "cloudflare_ruleset" "ratelimit" {
  zone_id     = local.zone_id
  kind        = "zone"
  name        = "Edge Guard rate limiting"
  phase       = "http_ratelimit"
  description = "Managed by Terraform (cf-edge-guard)."

  rules = [{
    action      = local.ratelimit.action
    expression  = local.ratelimit.expression
    description = local.ratelimit.description
    enabled     = true
    ratelimit = {
      characteristics     = local.ratelimit.characteristics
      period              = local.ratelimit.period
      requests_per_period = local.ratelimit.requests_per_period
      mitigation_timeout  = local.ratelimit.mitigation_timeout
    }
  }]
}

# ── Bot Fight Mode ───────────────────────────────────────────────────────────
# Zone-wide, cannot be scoped to one hostname on Free. Applied as a second step.

resource "cloudflare_bot_management" "this" {
  zone_id = local.zone_id

  # The API refuses fight_mode without JavaScript Detections:
  #   "cannot enable Fight_Mode while EnableJS is disabled"
  # JS Detections is also zone-wide: it injects a small, non-blocking detection
  # script into HTML responses across the zone, the main site included.
  enable_js  = var.enable_bot_fight_mode
  fight_mode = var.enable_bot_fight_mode
}

# ── DDoS ─────────────────────────────────────────────────────────────────────
# Cloudflare's L3-L7 DDoS managed rulesets are always on and unmetered on every
# plan, including Free. Overriding them (ddos_l7 phase) requires Enterprise with
# the Advanced DDoS Protection add-on, so no DDoS resource is declared here.
