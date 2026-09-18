output "url" {
  description = "Live Edge Guard URL."
  value       = "https://${var.hostname}/"
}

output "zone_id" {
  value = local.zone_id
}

output "turnstile_sitekey" {
  description = "Public Turnstile sitekey (safe to expose)."
  value       = cloudflare_turnstile_widget.edge_guard.sitekey
}

output "waf_rule_count" {
  value = length(local.waf_rules)
}
