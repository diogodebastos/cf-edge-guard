data "cloudflare_zone" "this" {
  filter = {
    name = var.zone_name
  }
}

locals {
  zone_id    = data.cloudflare_zone.this.zone_id
  account_id = coalesce(var.account_id, data.cloudflare_zone.this.account.id)

  # Host filter reused by every rule that must NOT affect the main site.
  host_scope = "http.host eq \"${var.hostname}\""
}

# ── Zone settings ────────────────────────────────────────────────────────────
# These are zone-wide: they apply to diogodebastos.com as well as Edge Guard.
# The SSL mode is deliberately left untouched so the main site cannot break.

resource "cloudflare_zone_setting" "always_use_https" {
  zone_id    = local.zone_id
  setting_id = "always_use_https"
  value      = "on"
}

resource "cloudflare_zone_setting" "min_tls_version" {
  zone_id    = local.zone_id
  setting_id = "min_tls_version"
  value      = "1.2"
}

resource "cloudflare_zone_setting" "hsts" {
  zone_id    = local.zone_id
  setting_id = "security_header"
  value = {
    strict_transport_security = {
      enabled            = true
      max_age            = 31536000
      include_subdomains = false
      preload            = false
      nosniff            = false
    }
  }
}
