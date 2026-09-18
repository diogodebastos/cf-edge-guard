# ── Cache rules ──────────────────────────────────────────────────────────────
# Host-scoped: only Edge Guard's /static/* is touched, the main site's caching
# is left exactly as it was.

locals {
  cache_rule = {
    description = "Edge Guard: cache /static/* at the edge for 5 minutes"
    scope       = "host-scoped"
    action      = "set_cache_settings"
    expression  = "(${local.host_scope} and starts_with(http.request.uri.path, \"/static/\"))"
    edge_ttl    = 300
  }
}

resource "cloudflare_ruleset" "cache" {
  zone_id     = local.zone_id
  kind        = "zone"
  name        = "Edge Guard cache rules"
  phase       = "http_request_cache_settings"
  description = "Managed by Terraform (cf-edge-guard)."

  rules = [{
    action      = local.cache_rule.action
    expression  = local.cache_rule.expression
    description = local.cache_rule.description
    enabled     = true
    action_parameters = {
      cache = true
      edge_ttl = {
        mode    = "override_origin"
        default = local.cache_rule.edge_ttl
      }
      browser_ttl = {
        mode    = "override_origin"
        default = 300
      }
    }
  }]
}
