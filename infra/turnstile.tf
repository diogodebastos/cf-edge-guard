# Managed-mode Turnstile widget guarding the two Workers AI endpoints.
resource "cloudflare_turnstile_widget" "edge_guard" {
  account_id = local.account_id
  name       = "edge-guard"
  domains    = [var.hostname]
  mode       = "managed"
}
